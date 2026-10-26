import { lstat, realpath } from "node:fs/promises"
import { IncomingHttpHeaders } from "node:http"
import { join, resolve } from "node:path"
import { Readable } from "node:stream"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { imageKindSchema, type ImageKind } from "./mediaImageProtocol"
import { admitReceivingMediaJob, markMediaJobQueuedAfterClosedReceipt } from "./mediaJobAdmission"
import { finishMediaJobReceipt, startMediaJobReceipt, type MediaJobReceiptClaim } from "./mediaJobReceipts"
import { MediaUploadError, multipartContentTypeSchema } from "./mediaUploadProtocol"
import { receiveMediaUpload, type MediaUploadResult } from "./mediaUploadReceiver"
import prisma from "./prisma"
import { getMediaRuntimeOwnerId } from "./mediaRuntimeContext"

const intakeInputSchema = z.object({
  ownerId: z.number().int().positive(),
  teamId: z.number().int().positive().optional(),
  resourceKey: z.string().trim().min(1).max(255),
  imageKind: imageKindSchema,
}).strict()

const intakeOptionsSchema = z.object({
  temporaryRoot: z.string().min(1),
  signal: z.custom<AbortSignal>((value) => value instanceof AbortSignal).optional(),
}).strict()

type SourceObserver = {
  closed: Promise<void>
  failure?: MediaUploadError
  handingToReceiver: boolean
  stopping: boolean
  dispose(): void
  stopAndWait(): Promise<void>
}

// 📚 Escuchamos errores antes de esperar a PostgreSQL para no perder un cierre ocurrido
// 📚 mientras se crea la admisión; el facade es dueño del stream tras su validación.
function observeSource(source: Readable, signal?: AbortSignal): SourceObserver {
  let resolveClosed!: () => void
  const closed = source.closed
    ? Promise.resolve()
    : new Promise<void>((resolveClose) => { resolveClosed = resolveClose })
  let failure: MediaUploadError | undefined
  let handingToReceiver = false
  let stopping = false
  const onError = (): void => { failure ??= new MediaUploadError("UPLOAD_INTERRUPTED") }
  const onClose = (): void => {
    resolveClosed?.()
    if (!source.readableEnded && !stopping) failure ??= new MediaUploadError("UPLOAD_INTERRUPTED")
  }
  const onAbort = (): void => {
    failure ??= new MediaUploadError("UPLOAD_ABORTED")
    if (!handingToReceiver && !source.destroyed) source.destroy()
  }
  source.on("error", onError)
  source.once("close", onClose)
  signal?.addEventListener("abort", onAbort, { once: true })
  if (signal?.aborted) onAbort()

  return {
    closed,
    get failure() { return failure },
    set handingToReceiver(value: boolean) { handingToReceiver = value },
    set stopping(value: boolean) { stopping = value },
    dispose() {
      source.removeListener("error", onError)
      source.removeListener("close", onClose)
      signal?.removeEventListener("abort", onAbort)
    },
    async stopAndWait() {
      stopping = true
      if (!source.destroyed && !source.closed) source.destroy()
      await closed
    },
  }
}

// 📚 La raíz temporal es configuración interna existente y canónica; resolverla antes
// 📚 de admitir evita reservar una plaza si ya se conoce un symlink o directorio inválido.
async function resolveTemporaryRoot(candidate: string): Promise<string> {
  try {
    const requested = resolve(candidate)
    const info = await lstat(requested)
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("INVALID_ROOT")
    return await realpath(requested)
  } catch {
    throw new AppError(500, "El directorio temporal de imágenes no está disponible")
  }
}

// 📚 El preflight evita reservar capacidad ante una cabecera ya incompatible;
// 📚 Busboy comprobará después la estructura completa del formulario.
function validHeaders(headers: IncomingHttpHeaders): boolean {
  const contentType = headers && typeof headers === "object" && !Array.isArray(headers)
    ? headers["content-type"]
    : undefined
  return typeof contentType === "string" && multipartContentTypeSchema.safeParse(contentType).success
}

// 📚 Adaptamos el error de transporte al contrato de errores de la app sin copiar
// 📚 propiedades privadas como cleanupPendingDirectory a la respuesta.
function asAppError(error: MediaUploadError): AppError {
  return new AppError(error.code === "UPLOAD_ABORTED" ? 409 : error.statusCode, error.message)
}

// 📚 Los conflictos de negocio conservan su código; un fallo de DB queda como 503
// 📚 con causa privada, sin afirmar si el commit llegó a ocurrir.
function preserveOrUnavailable(error: unknown, message: string): AppError {
  if (error instanceof AppError) return error
  const unavailable = new AppError(503, message)
  Object.defineProperty(unavailable, "cause", { value: error, enumerable: false })
  return unavailable
}

// 📚 Un directorio ocupado o dudoso no demuestra quién escribe en él; cerrar este
// 📚 source no autoriza liberar la reserva ni limpiar archivos de otro intento.
function isUncertainWorkspaceFailure(error: MediaUploadError): boolean {
  return error.code === "WORKSPACE_EXISTS" || error.code === "INVALID_WORKSPACE"
}

// 📚 La ruta de limpieza solo se conserva si coincide exactamente con el directorio
// 📚 asignado al claim; el intake no borra datos y no convierte rutas en DTOs públicos.
function safePendingDirectory(path: string | undefined, claim: MediaJobReceiptClaim): string | undefined {
  return path === claim.inputDirectory ? path : undefined
}

// 📚 El caller ya confirmó cierre. Promise<never> expresa que registrar el terminal
// 📚 termina lanzando un error seguro, nunca un valor con el que seguir encolando.
async function failKnownReceipt(claim: MediaJobReceiptClaim, error: MediaUploadError, db: PrismaClient): Promise<never> {
  if (isUncertainWorkspaceFailure(error)) throw asAppError(error)
  await finishMediaJobReceipt(claim, {
    status: error.code === "UPLOAD_ABORTED" ? "CANCELED" : "FAILED",
    failureCode: error.code,
    cleanupPendingDirectory: safePendingDirectory(error.cleanupPendingDirectory, claim),
  }, db)
  throw asAppError(error)
}

// 📚 Antes de confirmar en DB, el resultado debe nombrar el archivo del claim propio;
// 📚 esta validación de identidad no sustituye la decodificación posterior con Sharp.
function assertReceiverResult(result: MediaUploadResult, claim: MediaJobReceiptClaim): void {
  if (result.directory !== claim.inputDirectory
    || result.inputPath !== join(claim.inputDirectory, "input.tmp")
    || !Number.isSafeInteger(result.bytes) || result.bytes <= 0
    || (result.inputFormat !== "png" && result.inputFormat !== "jpeg")) {
    throw new AppError(500, "El resultado temporal no coincide con el recibo de imagen")
  }
}

export type MediaUploadIntakeResult = {
  job: Awaited<ReturnType<typeof markMediaJobQueuedAfterClosedReceipt>>
  cancellation: "none" | "too_late"
}

// 📚 La fachada ordena DB→claim→streams→CAS sin mantener una transacción abierta durante
// 📚 I/O físico; ningún caller puede elegir el UUID del workspace ni confirmar sin token.
export async function receiveAndQueueMediaJob(
  source: Readable,
  headers: IncomingHttpHeaders,
  input: unknown,
  options: unknown,
  db: PrismaClient = prisma,
): Promise<MediaUploadIntakeResult> {
  if (!(source instanceof Readable)) throw new AppError(400, "La fuente de imagen no es válida")
  const parsedInput = intakeInputSchema.safeParse(input)
  const parsedOptions = intakeOptionsSchema.safeParse(options)
  const signal = parsedOptions.success ? parsedOptions.data.signal : undefined
  const observer = observeSource(source, signal)
  try {
    if (!parsedInput.success || !parsedOptions.success || !validHeaders(headers)
      || source.readableFlowing === true) {
      await observer.stopAndWait()
      throw new AppError(400, "La petición de imagen no es válida")
    }
    if (signal?.aborted) {
      await observer.stopAndWait()
      throw new AppError(409, "Se canceló la recepción de la imagen")
    }
    if (source.destroyed || source.readableEnded) {
      await observer.stopAndWait()
      throw new AppError(400, "La fuente de imagen no está disponible")
    }

    let temporaryRoot: string
    try {
      temporaryRoot = await resolveTemporaryRoot(parsedOptions.data.temporaryRoot)
    } catch (error) {
      await observer.stopAndWait()
      throw preserveOrUnavailable(error, "No se pudo reservar el trabajo de imagen")
    }
    if (observer.failure) {
      await observer.stopAndWait()
      throw asAppError(observer.failure)
    }

    const request = parsedInput.data
    let admitted
    try {
      admitted = await admitReceivingMediaJob({
        ownerId: request.ownerId,
        ...(request.teamId === undefined ? {} : { teamId: request.teamId }),
        resourceKey: request.resourceKey,
      }, db)
    } catch (error) {
      await observer.stopAndWait()
      throw preserveOrUnavailable(error, "No se pudo iniciar el recibo de imagen")
    }

    const identity = {
      id: admitted.id,
      ownerId: request.ownerId,
      teamId: request.teamId ?? null,
      resourceKey: request.resourceKey,
    }
    let claim: MediaJobReceiptClaim
    try {
      claim = await startMediaJobReceipt(identity, {
        inputDirectory: join(temporaryRoot, admitted.id),
        imageKind: request.imageKind,
      }, db)
    } catch (error) {
      await observer.stopAndWait()
      throw error
    }

    if (observer.failure) {
      await observer.stopAndWait()
      return await failKnownReceipt(claim, observer.failure, db)
    }

    observer.handingToReceiver = true
    let received: MediaUploadResult
    try {
      received = await receiveMediaUpload(source, headers, {
        temporaryRoot,
        jobId: admitted.id,
        signal,
        ...(getMediaRuntimeOwnerId() ? { ownership: {
          runtimeOwnerId: getMediaRuntimeOwnerId()!, receiptToken: claim.receiptToken,
        } } : {}),
      })
    } catch (error) {
      await observer.stopAndWait()
      if (error instanceof MediaUploadError) return await failKnownReceipt(claim, error, db)
      // 📚 Un error inesperado no demuestra que el stream ni el directorio sean propios;
      // 📚 conservamos RECEIVING para que una reconciliación futura decida qué ocurrió.
      const unavailable = new AppError(503, "No se pudo completar la recepción de imagen")
      Object.defineProperty(unavailable, "cause", { value: error, enumerable: false })
      throw unavailable
    }
    await observer.closed
    assertReceiverResult(received, claim)

    // 📚 Una cancelación antes del CAS libera la reserva pero deja el directorio como
    // 📚 cleanupPending; si el CAS de QUEUED gana durante la cancelación, se informa too_late.
    if (signal?.aborted) {
      await finishMediaJobReceipt(claim, {
        status: "CANCELED",
        failureCode: "UPLOAD_ABORTED",
        cleanupPendingDirectory: claim.inputDirectory,
      }, db)
      throw new AppError(409, "Se canceló la recepción de la imagen")
    }

    const job = await markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true }, db)
    // 📚 La cancelación durable puede ganar sin que el signal local se haya leído
    // 📚 todavía. Un terminal confirmado nunca se anuncia como subida aceptada.
    if (job.status === "CANCELED") throw new AppError(409, "Se canceló la recepción de la imagen")
    return { job, cancellation: signal?.aborted ? "too_late" : "none" }
  } finally {
    observer.dispose()
  }
}
