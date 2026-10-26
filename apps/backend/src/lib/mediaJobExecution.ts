import { lstat, realpath, rm } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { executeMediaImage, type ImageExecutionOptions } from "./mediaImageExecutor"
import { imageKindSchema, MediaImageError, type ImageKind } from "./mediaImageProtocol"
import { type ClaimedMediaJob } from "./mediaJobClaims"
import prisma from "./prisma"

const claimSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.number().int().positive(),
  teamId: z.number().int().positive().nullable(),
  resourceKey: z.string().min(1),
  slot: z.union([z.literal(1), z.literal(2)]),
  executionToken: z.string().uuid(),
  startedAt: z.date(),
}).strict()

const workspaceSchema = z.object({
  temporaryRoot: z.string().min(1),
  kind: imageKindSchema,
}).strict()

type ExecutionWorkspace = { rootDirectory: string; jobDirectory: string }
type TerminalStatus = "FAILED" | "CANCELED"

// 📚 Este error distingue un fallo local previo al CAS de inicio: el controlador
// 📚 puede liberar la reserva solo cuando sabe que esta invocación no lanzó Sharp.
export class MediaJobPreparationError extends Error {
  constructor() {
    super("El espacio temporal del trabajo no está preparado")
    this.name = "MediaJobPreparationError"
  }
}

// 📚 La raíz viene de configuración confiable y el subdirectorio se deriva del UUID
// 📚 reclamado; el navegador nunca elige ni puede escapar la ruta de trabajo.
async function prepareWorkspace(temporaryRoot: string, jobId: string): Promise<ExecutionWorkspace> {
  try {
    const configuredRoot = resolve(temporaryRoot)
    const rootInfo = await lstat(configuredRoot)
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("INVALID_ROOT")
    const rootDirectory = await realpath(configuredRoot)
    const jobDirectory = join(rootDirectory, jobId)
    const jobInfo = await lstat(jobDirectory)
    if (!jobInfo.isDirectory() || jobInfo.isSymbolicLink()
      || dirname(jobDirectory) !== rootDirectory || await realpath(jobDirectory) !== jobDirectory) {
      throw new Error("INVALID_JOB_DIRECTORY")
    }
    const inputInfo = await lstat(join(jobDirectory, "input.tmp"))
    if (!inputInfo.isFile() || inputInfo.isSymbolicLink()) throw new Error("INVALID_INPUT")
    return { rootDirectory, jobDirectory }
  } catch {
    // 📚 Fail-closed: antes del CAS no iniciamos el worker si la ruta/entrada no es propia.
    throw new MediaJobPreparationError()
  }
}

// 📚 Solo se admite borrar el intento que devuelve el ejecutor y que sigue dentro
// 📚 de la carpeta exacta del trabajo; la entrada y variantes previas nunca se tocan.
function isOwnedAttemptPath(candidate: string, jobDirectory: string): string | null {
  const directory = resolve(candidate)
  return dirname(directory) === jobDirectory && basename(directory).startsWith("variants-")
    ? directory
    : null
}

// 📚 Verifica existencia, tipo y canonicalidad antes de registrar una ruta de salida
// 📚 como resultado o borrarla; resolve() por sí solo no neutraliza symlinks.
async function verifyAttemptDirectory(candidate: string, jobDirectory: string): Promise<string | null> {
  const directory = isOwnedAttemptPath(candidate, jobDirectory)
  if (!directory) return null
  try {
    const info = await lstat(directory)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) return null
    return directory
  } catch {
    return null
  }
}

// 📚 Solo devolvemos true tras borrar el intento propio o confirmar que ya no existe.
// 📚 Permisos, symlinks y rutas dudosas conservan el marcador pending para reconciliación.
async function removeCurrentAttempt(outputDirectory: string, jobDirectory: string): Promise<boolean> {
  const directory = isOwnedAttemptPath(outputDirectory, jobDirectory)
  if (!directory) return false
  try {
    const info = await lstat(directory)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) return false
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return true
    return false
  }
  try {
    await rm(directory, { recursive: true, force: false })
    return true
  } catch {
    return false
  }
}

// 📚 Solo guarda una ruta de limpieza después de comprobar que nombra un directorio
// 📚 canónico variants-* hijo de este trabajo; rutas ajenas se descartan.
async function safeCleanupPath(candidate: string | undefined, jobDirectory: string): Promise<string | null> {
  if (!candidate) return null
  // 📚 El worker ya devolvió esta ruta propia; para guardar un pending basta limitar
  // 📚 su forma y padre. El reconciliador comprobará lstat/realpath antes de borrar.
  return isOwnedAttemptPath(candidate, jobDirectory)
}

// 📚 Las rutas/nombres internos del driver quedan en cause para observabilidad local,
// 📚 mientras el error entregado al consumidor no filtra filesystem ni SQL.
function persistenceUnavailable(cause: unknown): AppError {
  const error = new AppError(503, "No se pudo guardar el estado del procesamiento")
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}

// 📚 La misma identidad de toma protege las escrituras; owner/team/resource atan
// 📚 el resultado al registro y destino resuelto por el servidor para este trabajo.
function claimWhere(claim: ClaimedMediaJob, executorStartedAt?: Date | null): Prisma.MediaJobWhereInput {
  return {
    id: claim.id,
    ownerId: claim.ownerId,
    teamId: claim.teamId,
    resourceKey: claim.resourceKey,
    status: "PROCESSING",
    processingSlot: claim.slot,
    executionToken: claim.executionToken,
    processingStartedAt: claim.startedAt,
    ...(executorStartedAt === undefined ? {} : { executorStartedAt }),
  }
}

// 📚 La toma se convierte en una única ejecución mediante compare-and-set (CAS):
// 📚 solo una llamada puede cambiar executorStartedAt de NULL a su marca de inicio.
export async function executeClaimedMediaJob(
  claim: ClaimedMediaJob,
  workspaceInput: { temporaryRoot: string; kind: ImageKind },
  options: ImageExecutionOptions = {},
  db: PrismaClient = prisma,
): Promise<{ id: string; status: "PUBLISHING"; cancellation: "none" | "too_late" }> {
  const parsedClaim = claimSchema.safeParse(claim)
  const parsedWorkspace = workspaceSchema.safeParse(workspaceInput)
  if (!parsedClaim.success || !parsedWorkspace.success) {
    throw new AppError(400, "La toma o el tipo de imagen no son válidos")
  }
  const validClaim = parsedClaim.data
  const workspace = await prepareWorkspace(parsedWorkspace.data.temporaryRoot, validClaim.id)
  const executorStartedAt = new Date()

  let started: number
  try {
    started = (await db.mediaJob.updateMany({
      where: {
        ...claimWhere(validClaim, null),
        // 📚 El recibo persistido es la autoridad del workspace. Solo toleramos
        // 📚 campos ambos nulos para los tests históricos que construyen jobs a mano.
        OR: [
          { imageKind: parsedWorkspace.data.kind, inputDirectory: workspace.jobDirectory },
          { imageKind: null, inputDirectory: null },
        ],
      },
      data: {
        executorStartedAt,
        // 📚 El CAS solo llega aquí si estos campos ya coinciden o ambos eran
        // 📚 null en el fixture legacy; persistir el mismo valor cumple CHECK sin reemplazar el recibo.
        imageKind: parsedWorkspace.data.kind,
        inputDirectory: workspace.jobDirectory,
      },
    })).count
  } catch (error) {
    throw persistenceUnavailable(error)
  }
  if (started !== 1) throw new AppError(409, "La toma ya fue iniciada o dejó de ser válida")

  let cancellationRequested: boolean
  try {
    cancellationRequested = (await db.mediaJob.findFirst({
      where: { ...claimWhere(validClaim, executorStartedAt), cancelRequestedAt: { not: null } },
      select: { id: true },
    })) !== null
  } catch (error) {
    // 📚 Si PostgreSQL no responde no se inventa FAILED: el slot queda reservado
    // 📚 y recuperación podrá decidir cuando vuelva a tener evidencia durable.
    throw persistenceUnavailable(error)
  }

  let result: Awaited<ReturnType<typeof executeMediaImage>>
  try {
    // 📚 Una cancelación persistida entre claim y ejecución no depende de que el
    // 📚 mismo proceso haya observado el abort; se confirma terminal antes de Sharp.
    if (cancellationRequested || options.signal?.aborted) throw new MediaImageError("CANCELED")
    result = await executeMediaImage({ directory: workspace.jobDirectory, kind: parsedWorkspace.data.kind }, {
      ...options,
      onSpawn: async (spawned) => {
        const directory = await verifyAttemptDirectory(spawned.outputDirectory, workspace.jobDirectory)
        if (!directory || !Number.isSafeInteger(spawned.pid) || spawned.pid <= 0) {
          throw new AppError(500, "No se pudo registrar el trabajador de imagen")
        }
        // 📚 Este CAS ocurre antes de enviar la orden IPC. Recuperación podrá probar
        // 📚 si ese PID sigue vivo, sin usar la antigüedad del job como prueba de muerte.
        const registered = await db.mediaJob.updateMany({
          where: { ...claimWhere(validClaim, executorStartedAt), workerPid: null, workerDirectory: null },
          data: { workerPid: spawned.pid, workerDirectory: directory },
        })
        if (registered.count !== 1) throw new AppError(409, "La toma cambió antes de registrar el trabajador")
        await options.onSpawn?.(spawned)
      },
    })
  } catch (error) {
    const mediaError = error instanceof MediaImageError ? error : new MediaImageError("WORKER_FAILED")
    const status: TerminalStatus = mediaError.code === "CANCELED" ? "CANCELED" : "FAILED"
    const cleanupPendingDirectory = await safeCleanupPath(
      mediaError.cleanupPendingDirectory ?? (status === "CANCELED" ? workspace.jobDirectory : undefined),
      workspace.jobDirectory,
    )
    let finished: number
    try {
      finished = (await db.mediaJob.updateMany({
        where: claimWhere(validClaim, executorStartedAt),
        data: {
          status,
          activeResourceKey: null,
          processingSlot: null,
          completedAt: new Date(),
          failureCode: mediaError.code,
          resultDirectory: null,
          // 📚 DbNull deja NULL de SQL; JSON null es otro valor y no un manifiesto objeto.
          resultManifest: Prisma.DbNull,
          cleanupPendingDirectory,
        },
      })).count
    } catch (databaseError) {
      throw persistenceUnavailable(databaseError)
    }
    if (finished !== 1) throw new AppError(409, "La toma cambió antes de guardar el fallo")
    throw new AppError(status === "CANCELED" ? 409 : 422, mediaError.message)
  }

  if (options.signal?.aborted) {
    const outputDirectory = await safeCleanupPath(result.outputDirectory, workspace.jobDirectory)
    if (!outputDirectory) throw new AppError(500, "El resultado temporal no pertenece a esta toma")
    if (!await verifyAttemptDirectory(outputDirectory, workspace.jobDirectory)) {
      throw new AppError(500, "El resultado temporal no pudo verificarse")
    }
    let canceled: number
    try {
      canceled = (await db.mediaJob.updateMany({
        where: claimWhere(validClaim, executorStartedAt),
        data: {
          status: "CANCELED",
          activeResourceKey: null,
          processingSlot: null,
          completedAt: new Date(),
          failureCode: "CANCELED",
          resultDirectory: null,
          resultManifest: Prisma.DbNull,
          // 📚 Se registra la limpieza antes de borrar; si falla esta escritura, el
          // 📚 resultado sigue en disco y la toma conserva su reserva para revisión.
          cleanupPendingDirectory: outputDirectory,
        },
      })).count
    } catch (databaseError) {
      throw persistenceUnavailable(databaseError)
    }
    if (canceled !== 1) throw new AppError(409, "La toma cambió antes de guardar la cancelación")
    const removed = await removeCurrentAttempt(outputDirectory, workspace.jobDirectory)
    if (removed) {
      // 📚 Solo retiramos la referencia si ya quitamos el intento. Si falla este UPDATE,
      // 📚 queda un pending verificable y el estado CANCELED confirmado no se revierte.
      try {
        await db.mediaJob.updateMany({
          where: {
            id: validClaim.id,
            ownerId: validClaim.ownerId,
            teamId: validClaim.teamId,
            resourceKey: validClaim.resourceKey,
            executionToken: validClaim.executionToken,
            status: "CANCELED",
            processingSlot: null,
            cleanupPendingDirectory: outputDirectory,
          },
          data: { cleanupPendingDirectory: null },
        })
      } catch {
        // 📚 La cancelación ya está confirmada; la referencia pendiente se reconcilia después.
      }
    }
    throw new AppError(409, "Se canceló el procesamiento de la imagen")
  }

  const { outputDirectory, ...manifest } = result
  let published: number
  try {
    published = (await db.mediaJob.updateMany({
      where: claimWhere(validClaim, executorStartedAt),
      data: {
        status: "PUBLISHING",
        resultDirectory: outputDirectory,
        resultManifest: manifest as unknown as Prisma.InputJsonObject,
        failureCode: null,
        completedAt: null,
      },
    })).count
  } catch (error) {
    throw persistenceUnavailable(error)
  }
  if (published !== 1) throw new AppError(409, "La toma cambió antes de entregar el resultado")

  return { id: validClaim.id, status: "PUBLISHING", cancellation: options.signal?.aborted ? "too_late" : "none" }
}
