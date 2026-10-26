import type { Request, Response } from "express"
import { PassThrough } from "node:stream"
import { IMAGE_MAX_BYTES } from "./mediaImageProtocol"

const MULTIPART_OVERHEAD_BYTES = 64 * 1024
const RECEIVE_DEADLINE_MS = 120_000

export type MediaHttpUploadFailure = "BODY_TOO_LARGE" | "RECEIVE_TIMEOUT" | "CLIENT_DISCONNECTED" | "RUNTIME_ABORTED"

export type MediaHttpUploadBridge = {
  source: PassThrough
  signal: AbortSignal
  get failure(): MediaHttpUploadFailure | null
  markAccepted(): void
  dispose(): void
}

// 📚 Este puente mantiene la petición HTTP separada del parser: la contrapresión limita memoria y el AbortSignal coordina su teardown.
export function createMediaHttpUploadBridge(
  req: Request,
  res: Response,
  receiptSignal: AbortSignal,
): MediaHttpUploadBridge {
  const source = new PassThrough({ highWaterMark: 64 * 1024 })
  const localAbort = new AbortController()
  const signal = AbortSignal.any([receiptSignal, localAbort.signal])
  let failure: MediaHttpUploadFailure | null = null
  let accepted = false
  let bytes = 0
  let timer: NodeJS.Timeout | undefined

  const stop = (reason: MediaHttpUploadFailure): void => {
    failure ??= reason
    if (timer) clearTimeout(timer)
    req.unpipe(source)
    req.pause()
    if (!localAbort.signal.aborted) localAbort.abort()
    if (!source.destroyed) source.destroy()
  }
  const onData = (chunk: Buffer | string): void => {
    bytes += Buffer.byteLength(chunk)
    if (bytes > IMAGE_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) stop("BODY_TOO_LARGE")
  }
  const onAborted = (): void => stop("CLIENT_DISCONNECTED")
  const onRequestError = (): void => stop("CLIENT_DISCONNECTED")
  const onRequestClose = (): void => {
    if (!req.complete) stop("CLIENT_DISCONNECTED")
  }
  const onResponseClose = (): void => {
    if (!accepted && !res.writableEnded) stop("CLIENT_DISCONNECTED")
  }
  const onReceiptAbort = (): void => stop("RUNTIME_ABORTED")
  const onEnd = (): void => { if (timer) clearTimeout(timer) }

  req.on("data", onData)
  req.once("aborted", onAborted)
  req.once("error", onRequestError)
  req.once("close", onRequestClose)
  req.once("end", onEnd)
  res.once("close", onResponseClose)
  receiptSignal.addEventListener("abort", onReceiptAbort, { once: true })
  if (receiptSignal.aborted) onReceiptAbort()
  timer = setTimeout(() => stop("RECEIVE_TIMEOUT"), RECEIVE_DEADLINE_MS)
  timer.unref()

  // 📚 La consulta de DB y el lease ocurren antes de instalar listeners: detectamos una desconexión que llegó durante esa espera.
  if (req.aborted || req.destroyed || res.destroyed || res.writableEnded) {
    stop("CLIENT_DISCONNECTED")
  } else {
    // 📚 pipe propaga backpressure sin pipeline(req, source), que cerraría la conexión antes de devolver un error JSON.
    req.pipe(source)
  }

  return {
    source,
    signal,
    get failure() { return failure },
    markAccepted() { accepted = true },
    dispose() {
      if (timer) clearTimeout(timer)
      req.removeListener("data", onData)
      req.removeListener("aborted", onAborted)
      req.removeListener("error", onRequestError)
      req.removeListener("close", onRequestClose)
      req.removeListener("end", onEnd)
      res.removeListener("close", onResponseClose)
      receiptSignal.removeEventListener("abort", onReceiptAbort)
      req.unpipe(source)
    },
  }
}
