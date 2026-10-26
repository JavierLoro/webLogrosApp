import { constants } from "node:fs"
import { lstat, open, realpath, readdir, rmdir, unlink } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import prisma from "./prisma"

const jobIdSchema = z.string().uuid()
const variantFilename = /^image-[1-9]\d*x[1-9]\d*\.(jpg|png)$/
const RECEIPT_OWNER_MARKER = ".receipt-owner.json"
const MAX_RECEIPT_MARKER_BYTES = 1024
type TerminalStatus = "SUCCEEDED" | "FAILED" | "CANCELED" | "INTERRUPTED"

type CleanupRow = {
  id: string
  ownerId: number
  teamId: number | null
  resourceKey: string
  status: TerminalStatus | "RECEIVING" | "QUEUED" | "PROCESSING" | "PUBLISHING" | "INTERRUPTED"
  runtimeOwnerId: string | null
  receiptToken: string | null
  inputDirectory: string | null
  resultDirectory: string | null
  workerDirectory: string | null
  cleanupPendingDirectory: string | null
  temporaryCleanedAt: Date | null
}

// 📚 Un directorio temporal solo se limpia tras un estado terminal. El marcador
// 📚 durable se mueve por etapas para que cada borrado tenga una ruta recuperable.
export async function cleanupTerminalMediaJobTemporaryFiles(
  jobId: string,
  temporaryRoot: string,
  db: PrismaClient = prisma,
  options: { ownerAndWorkerDeadConfirmed?: boolean; signal?: AbortSignal } = {},
): Promise<{ id: string; cleaned: boolean }> {
  if (options.signal?.aborted) return { id: jobId, cleaned: false }
  if (!jobIdSchema.safeParse(jobId).success || !temporaryRoot.trim()) {
    throw new AppError(400, "La limpieza temporal no es válida")
  }

  const job = await findCleanupRow(jobId, db)
  if (!job) return { id: jobId, cleaned: true }
  if (job.temporaryCleanedAt !== null) return { id: jobId, cleaned: true }
  if (job.status !== "SUCCEEDED" && job.status !== "FAILED" && job.status !== "CANCELED" && job.status !== "INTERRUPTED") {
    return { id: jobId, cleaned: false }
  }

  const root = resolve(temporaryRoot)
  const jobDirectory = join(root, jobId)
  if (dirname(jobDirectory) !== root || basename(jobDirectory) !== jobId) {
    return { id: jobId, cleaned: false }
  }

  try {
    const rootInfo = await lstat(root)
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || await realpath(root) !== root) {
      return { id: jobId, cleaned: false }
    }
  } catch (error) {
    if (isMissing(error)) {
      if (job.inputDirectory !== null) return { id: jobId, cleaned: false }
      return { id: jobId, cleaned: await markTemporaryCleaned(job, db) }
    }
    throw cleanupError("No se pudo verificar la raíz temporal", error)
  }

  let directoryExists = true
  try {
    const directory = await lstat(jobDirectory)
    if (!directory.isDirectory() || directory.isSymbolicLink() || await realpath(jobDirectory) !== jobDirectory) {
      return { id: jobId, cleaned: false }
    }
  } catch (error) {
    if (!isMissing(error)) throw cleanupError("No se pudo verificar la carpeta temporal", error)
    directoryExists = false
  }
  if (!directoryExists) {
    if (options.signal?.aborted) return { id: jobId, cleaned: false }
    if (!job.cleanupPendingDirectory) return { id: jobId, cleaned: await markTemporaryCleaned(job, db) }
    const cleared = await clearPending(job, job.cleanupPendingDirectory, db)
    return { id: jobId, cleaned: cleared }
  }

  const ownedMarker = job.runtimeOwnerId !== null && await verifyReceiptOwnerMarker(job, jobDirectory)
  // 📚 El marker se elimina después de input y variantes; si la caída llega antes de rmdir, solo un jobdir vacío con pending exacto se puede cerrar.
  if (!ownedMarker && job.runtimeOwnerId !== null && job.cleanupPendingDirectory === jobDirectory
    && await removeOnlyIfEmpty(jobDirectory, options.signal)) {
    return { id: jobId, cleaned: await clearPending(job, jobDirectory, db) }
  }
  if (job.inputDirectory !== jobDirectory) {
    // 📚 Solo un marcador exacto más la prueba de owner/worker muertos permite limpiar el hueco anterior al CAS que guardaba inputDirectory.
    if (job.inputDirectory !== null || !options.ownerAndWorkerDeadConfirmed || !ownedMarker) {
      return { id: jobId, cleaned: false }
    }
  }

  const knownVariantDirectories = new Set<string>()
  if (job.cleanupPendingDirectory && job.cleanupPendingDirectory !== jobDirectory) {
    knownVariantDirectories.add(job.cleanupPendingDirectory)
  }
  if (job.workerDirectory) knownVariantDirectories.add(job.workerDirectory)
  if (job.resultDirectory) knownVariantDirectories.add(job.resultDirectory)
  if (options.ownerAndWorkerDeadConfirmed && ownedMarker) {
    // 📚 mkdtemp puede crear variants-* antes del CAS de onSpawn; el marcador propio y el proceso muerto autorizan descubrir solo esos hijos.
    try {
      for (const name of await readdir(jobDirectory)) {
        if (!name.startsWith("variants-") || name.length <= "variants-".length) continue
        const candidate = join(jobDirectory, name)
        const info = await lstat(candidate)
        if (!info.isDirectory() || info.isSymbolicLink() || await realpath(candidate) !== candidate) return { id: jobId, cleaned: false }
        knownVariantDirectories.add(candidate)
      }
    } catch (error) {
      if (!isMissing(error)) throw cleanupError("No se pudieron revisar variantes huérfanas", error)
      return { id: jobId, cleaned: false }
    }
  }
  let currentMarker = job.cleanupPendingDirectory

  for (const variantDirectory of knownVariantDirectories) {
    if (options.signal?.aborted) return { id: jobId, cleaned: false }
    if (!isDirectVariantDirectory(variantDirectory, jobDirectory)) return { id: jobId, cleaned: false }
  }
  if (job.runtimeOwnerId !== null && !await verifyOwnedReceiptWorkspace(job, jobDirectory, knownVariantDirectories)) {
    // 📚 Sin marcador propio o con sobrantes desconocidos no se borra nada y se conserva el pending para cuarentena/revisión.
    return { id: jobId, cleaned: false }
  }

  // 📚 resultDirectory/pending son rutas durables; recovery también puede descubrir variants-* tras probar marcador y muerte del escritor.
  // 📚 En ambos casos se aceptan solo hijos directos canónicos con nombres y tipos de archivo permitidos.
  for (const variantDirectory of knownVariantDirectories) {
    if (!isDirectVariantDirectory(variantDirectory, jobDirectory)) return { id: jobId, cleaned: false }
    if (!await setPending(job, variantDirectory, currentMarker, db)) return { id: jobId, cleaned: false }
    const removed = await removeKnownVariantDirectory(variantDirectory, jobDirectory, options.signal)
    if (!removed) return { id: jobId, cleaned: false }
    const nextMarker = await replacePending(job, variantDirectory, jobDirectory, db)
    if (!nextMarker) return { id: jobId, cleaned: false }
    currentMarker = jobDirectory
  }

  const markedJobDirectory = await setPending(job, jobDirectory, currentMarker, db)
  if (!markedJobDirectory) return { id: jobId, cleaned: false }
  // 📚 La parada/pérdida del lock aborta mantenimiento; una reserva DB previa no
  // 📚 autoriza a iniciar otro borrado después de observar esa señal.
  if (options.signal?.aborted) return { id: jobId, cleaned: false }
  try {
    const directoryInfo = await lstat(jobDirectory)
    if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()
      || dirname(jobDirectory) !== root || await realpath(jobDirectory) !== jobDirectory) {
      return { id: jobId, cleaned: false }
    }

    if (job.runtimeOwnerId !== null) {
      const beforeInputRemoval = await readdir(jobDirectory)
      if (beforeInputRemoval.some((name) => name !== RECEIPT_OWNER_MARKER && name !== "input.tmp")) {
        return { id: jobId, cleaned: false }
      }
    }
    const inputPath = join(jobDirectory, "input.tmp")
    try {
      const inputInfo = await lstat(inputPath)
      if (!inputInfo.isFile() || inputInfo.isSymbolicLink()) return { id: jobId, cleaned: false }
      if (options.signal?.aborted) return { id: jobId, cleaned: false }
      await unlink(inputPath)
    } catch (error) {
      if (!isMissing(error)) throw error
    }

    if (job.runtimeOwnerId !== null) {
      const remaining = await readdir(jobDirectory)
      if (remaining.length !== 1 || remaining[0] !== RECEIPT_OWNER_MARKER
        || !await verifyReceiptOwnerMarker(job, jobDirectory)) return { id: jobId, cleaned: false }
      if (options.signal?.aborted) return { id: jobId, cleaned: false }
      await unlink(join(jobDirectory, RECEIPT_OWNER_MARKER))
    }

    // 📚 No inspeccionamos ni borramos sobrantes desconocidos: rmdir solo confirma
    // 📚 que el espacio propio quedó vacío después de quitar input.tmp/variantes conocidas.
    if (options.signal?.aborted) return { id: jobId, cleaned: false }
    await rmdir(jobDirectory)
    const cleared = await clearPending(job, jobDirectory, db)
    return { id: jobId, cleaned: cleared }
  } catch (error) {
    if (isMissing(error)) {
      const cleared = await clearPending(job, jobDirectory, db)
      return { id: jobId, cleaned: cleared }
    }
    if (isDirectoryNotEmpty(error)) return { id: jobId, cleaned: false }
    throw cleanupError("No se pudo completar la limpieza temporal", error)
  }
}

// 📚 rmdir sobre un directorio vacío es seguro incluso si el marcador desapareció justo antes de una caída; nunca elimina archivos de terceros.
async function removeOnlyIfEmpty(jobDirectory: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const info = await lstat(jobDirectory)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(jobDirectory) !== jobDirectory
      || (await readdir(jobDirectory)).length !== 0) return false
    if (signal?.aborted) return false
    await rmdir(jobDirectory)
    return true
  } catch {
    return false
  }
}

async function findCleanupRow(jobId: string, db: PrismaClient): Promise<CleanupRow | null> {
  try {
    return await db.mediaJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        ownerId: true,
        teamId: true,
        resourceKey: true,
        status: true,
        runtimeOwnerId: true,
        receiptToken: true,
        inputDirectory: true,
        resultDirectory: true,
        workerDirectory: true,
        cleanupPendingDirectory: true,
        temporaryCleanedAt: true,
      },
    }) as CleanupRow | null
  } catch (error) {
    throw cleanupError("No se pudo consultar la limpieza temporal", error)
  }
}

// 📚 El marcador vincula el UUID temporal al recibo y owner persistidos; el JSON no se sigue si alguien sustituye el archivo por symlink.
async function verifyReceiptOwnerMarker(job: CleanupRow, jobDirectory: string): Promise<boolean> {
  if (!job.runtimeOwnerId || !job.receiptToken) return false
  const markerPath = join(jobDirectory, RECEIPT_OWNER_MARKER)
  try {
    const before = await lstat(markerPath)
    if (!before.isFile() || before.isSymbolicLink() || before.size <= 0 || before.size > MAX_RECEIPT_MARKER_BYTES) return false
    const handle = await open(markerPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    let contents: Buffer
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.size !== before.size || opened.size > MAX_RECEIPT_MARKER_BYTES) return false
      const chunks: Buffer[] = []
      let total = 0
      while (true) {
        const chunk = Buffer.allocUnsafe(Math.min(256, MAX_RECEIPT_MARKER_BYTES + 1 - total))
        const { bytesRead } = await handle.read(chunk, 0, chunk.byteLength, null)
        if (bytesRead === 0) break
        total += bytesRead
        if (total > MAX_RECEIPT_MARKER_BYTES) return false
        chunks.push(chunk.subarray(0, bytesRead))
      }
      if (total !== opened.size) return false
      contents = Buffer.concat(chunks, total)
    } finally {
      await handle.close()
    }
    const parsed: unknown = JSON.parse(contents.toString("utf8"))
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false
    const record = parsed as Record<string, unknown>
    const keys = Object.keys(record).sort()
    return keys.length === 3 && keys[0] === "jobId" && keys[1] === "receiptToken" && keys[2] === "runtimeOwnerId"
      && record.jobId === job.id && record.receiptToken === job.receiptToken && record.runtimeOwnerId === job.runtimeOwnerId
  } catch {
    return false
  }
}

// 📚 Antes de cualquier unlink verificamos todo el espacio propiedad del recibo; un archivo desconocido mantiene el marcador de cuarentena.
async function verifyOwnedReceiptWorkspace(
  job: CleanupRow,
  jobDirectory: string,
  variantDirectories: Set<string>,
): Promise<boolean> {
  if (!await verifyReceiptOwnerMarker(job, jobDirectory)) return false
  try {
    const names = await readdir(jobDirectory)
    const allowed = new Set([RECEIPT_OWNER_MARKER, "input.tmp", ...[...variantDirectories].map((path) => basename(path))])
    if (names.some((name) => !allowed.has(name))) return false
    const inputPath = join(jobDirectory, "input.tmp")
    try {
      const input = await lstat(inputPath)
      if (!input.isFile() || input.isSymbolicLink()) return false
    } catch (error) {
      if (!isMissing(error)) return false
    }
    for (const path of variantDirectories) {
      try {
        const directory = await lstat(path)
        if (!directory.isDirectory() || directory.isSymbolicLink() || await realpath(path) !== path) return false
        for (const entry of await readdir(path, { withFileTypes: true })) {
          const filePath = join(path, entry.name)
          const file = await lstat(filePath)
          if (!variantFilename.test(entry.name) || !file.isFile() || file.isSymbolicLink()) return false
        }
      } catch (error) {
        if (!isMissing(error)) return false
      }
    }
    return true
  } catch {
    return false
  }
}

function isDirectVariantDirectory(path: string, jobDirectory: string): boolean {
  return dirname(path) === jobDirectory && basename(path).startsWith("variants-")
}

async function removeKnownVariantDirectory(path: string, jobDirectory: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const info = await lstat(path)
    if (!info.isDirectory() || info.isSymbolicLink() || dirname(path) !== jobDirectory || await realpath(path) !== path) {
      return false
    }
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const filePath = join(path, entry.name)
      const file = await lstat(filePath)
      if (!variantFilename.test(entry.name) || !file.isFile() || file.isSymbolicLink()) return false
      if (signal?.aborted) return false
      await unlink(filePath)
    }
    if (signal?.aborted) return false
    await rmdir(path)
    return true
  } catch (error) {
    return isMissing(error)
  }
}

async function setPending(job: CleanupRow, path: string, expectedMarker: string | null, db: PrismaClient): Promise<boolean> {
  try {
    const changed = await db.mediaJob.updateMany({
      where: {
        id: job.id,
        ownerId: job.ownerId,
        teamId: job.teamId,
        resourceKey: job.resourceKey,
        status: job.status,
        inputDirectory: job.inputDirectory,
        cleanupPendingDirectory: expectedMarker,
      },
      data: { cleanupPendingDirectory: path },
    })
    return changed.count === 1
  } catch (error) {
    throw cleanupError("No se pudo reservar la limpieza temporal", error)
  }
}

async function replacePending(job: CleanupRow, oldPath: string, newPath: string, db: PrismaClient): Promise<boolean> {
  try {
    const changed = await db.mediaJob.updateMany({
      where: {
        id: job.id,
        ownerId: job.ownerId,
        teamId: job.teamId,
        resourceKey: job.resourceKey,
        status: job.status,
        inputDirectory: job.inputDirectory,
        cleanupPendingDirectory: oldPath,
      },
      data: { cleanupPendingDirectory: newPath },
    })
    return changed.count === 1
  } catch (error) {
    throw cleanupError("No se pudo actualizar la limpieza temporal", error)
  }
}

async function clearPending(job: CleanupRow, path: string, db: PrismaClient): Promise<boolean> {
  try {
    const changed = await db.mediaJob.updateMany({
      where: {
        id: job.id,
        ownerId: job.ownerId,
        teamId: job.teamId,
        resourceKey: job.resourceKey,
        status: job.status,
        cleanupPendingDirectory: path,
        inputDirectory: job.inputDirectory,
        resultDirectory: job.resultDirectory,
        workerDirectory: job.workerDirectory,
        temporaryCleanedAt: null,
      },
      data: {
        cleanupPendingDirectory: null,
        temporaryCleanedAt: new Date(),
      },
    })
    return changed.count === 1
  } catch (error) {
    throw cleanupError("No se pudo cerrar la limpieza temporal", error)
  }
}

// 📚 El sello terminal se escribe con CAS después de constatar ENOENT o completar rmdir; así un crash no convierte un borrado incierto en éxito.
async function markTemporaryCleaned(job: CleanupRow, db: PrismaClient): Promise<boolean> {
  try {
    const changed = await db.mediaJob.updateMany({
      where: {
        id: job.id,
        ownerId: job.ownerId,
        teamId: job.teamId,
        resourceKey: job.resourceKey,
        status: job.status,
        inputDirectory: job.inputDirectory,
        resultDirectory: job.resultDirectory,
        workerDirectory: job.workerDirectory,
        cleanupPendingDirectory: job.cleanupPendingDirectory,
        temporaryCleanedAt: null,
      },
      // 📚 La carpeta UUID completa ya fue confirmada ausente; se cierra el pending, pero las rutas/tokens históricos permanecen para satisfacer invariantes y auditoría.
      data: {
        temporaryCleanedAt: new Date(),
        cleanupPendingDirectory: null,
      },
    })
    return changed.count === 1
  } catch (error) {
    throw cleanupError("No se pudo confirmar la limpieza temporal", error)
  }
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}

function isDirectoryNotEmpty(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOTEMPTY"
}

function cleanupError(message: string, cause: unknown): AppError {
  const error = new AppError(503, message)
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}
