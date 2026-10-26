import { createHash } from "node:crypto"
import { Readable } from "node:stream"
import { AppError } from "../errors/AppError"
import type { MediaAssetVariant, MediaPublicationStore } from "./mediaPublication"

const MAX_IMAGE_BYTES = 10_000_000

export type PrivateImageMetadata = {
  etag: string
  contentType: "image/jpeg" | "image/png"
  contentLength: number
}

function contentType(format: MediaAssetVariant["format"]): PrivateImageMetadata["contentType"] {
  return format === "jpeg" ? "image/jpeg" : "image/png"
}

// 📚 Las operaciones S3 de lectura no exponen AbortSignal en el puerto actual; race libera HTTP y destruye un body que llegue tarde.
function awaitBeforeDeadline<T>(operation: Promise<T>, signal?: AbortSignal, onLate?: (value: T) => void): Promise<T> {
  if (!signal) return operation
  if (signal.aborted) {
    // 📚 El argumento Promise ya pudo arrancar S3 antes de entrar aquí. También
    // 📚 observamos su rechazo y cerramos un cuerpo tardío cuando el plazo ya venció.
    void operation.then((value) => { try { onLate?.(value) } catch {} }, () => {})
    return Promise.reject(signal.reason ?? new Error("MEDIA_READ_DEADLINE"))
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const removeAbort = (): void => signal.removeEventListener("abort", onAbort)
    const onAbort = (): void => {
      if (settled) return
      settled = true
      removeAbort()
      reject(signal.reason ?? new Error("MEDIA_READ_DEADLINE"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
    operation.then((value) => {
      if (settled) {
        onLate?.(value)
        return
      }
      settled = true
      removeAbort()
      resolve(value)
    }, (error: unknown) => {
      if (settled) return
      settled = true
      removeAbort()
      reject(error)
    })
  })
}

// 📚 HEAD comprueba que el objeto privado aún existe antes de permitir una respuesta 304 basada en su ETag.
export async function headPrivateMediaImage(
  store: MediaPublicationStore,
  assetId: string,
  variant: MediaAssetVariant,
  signal?: AbortSignal,
): Promise<PrivateImageMetadata | null> {
  const expectedType = contentType(variant.format)
  const stored = await awaitBeforeDeadline(store.head(variant.key), signal)
  if (!stored) return null
  if (stored.contentLength !== variant.size || stored.contentType !== expectedType || variant.size > MAX_IMAGE_BYTES) {
    throw new AppError(503, "La imagen privada no está disponible")
  }
  return {
    etag: `"${assetId}-${variant.sha256}"`,
    contentType: expectedType,
    contentLength: variant.size,
  }
}

// 📚 El generador limita y verifica cada byte mientras conserva streaming; un objeto corrupto aborta la respuesta sin cargarse entero en memoria.
export async function readPrivateMediaImage(
  store: MediaPublicationStore,
  variant: MediaAssetVariant,
  expected: PrivateImageMetadata,
  signal?: AbortSignal,
): Promise<Readable | null> {
  const stored = await awaitBeforeDeadline(store.get(variant.key), signal, (late) => late?.body.destroy())
  if (!stored) return null
  if (stored.contentLength !== expected.contentLength || stored.contentType !== expected.contentType) {
    stored.body.destroy()
    throw new AppError(503, "La imagen privada no está disponible")
  }

  const source = stored.body
  return Readable.from((async function* () {
    const hash = createHash("sha256")
    let total = 0
    try {
      for await (const chunk of source) {
        if (signal?.aborted) throw signal.reason ?? new Error("MEDIA_READ_DEADLINE")
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        total += bytes.byteLength
        if (total > expected.contentLength || total > MAX_IMAGE_BYTES) throw new Error("PRIVATE_IMAGE_TOO_LARGE")
        hash.update(bytes)
        yield bytes
      }
      if (total !== expected.contentLength || hash.digest("hex") !== variant.sha256) {
        throw new Error("PRIVATE_IMAGE_DIGEST_MISMATCH")
      }
    } finally {
      if (!source.destroyed) source.destroy()
    }
  })())
}

// 📚 Leemos el primer fragmento antes de anunciar Content-Type/Length; los fallos posteriores cierran el stream ya iniciado.
export async function primePrivateMediaImage(body: Readable, signal?: AbortSignal): Promise<Readable> {
  const iterator = body[Symbol.asyncIterator]()
  let first: IteratorResult<Buffer | string>
  try {
    first = await awaitBeforeDeadline(iterator.next(), signal, () => body.destroy())
    if (first.done) throw new Error("PRIVATE_IMAGE_EMPTY")
  } catch {
    body.destroy()
    throw new AppError(503, "La imagen privada no está disponible")
  }

  return Readable.from((async function* () {
    try {
      yield first.value
      while (true) {
        const next = await awaitBeforeDeadline(iterator.next(), signal, () => body.destroy())
        if (next.done) return
        yield next.value
      }
    } finally {
      body.destroy()
      try { await iterator.return?.() } catch { /* El stream ya se cierra; no sustituimos el error original de lectura. */ }
    }
  })())
}
