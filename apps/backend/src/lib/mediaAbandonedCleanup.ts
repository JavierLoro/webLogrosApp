import { constants } from "node:fs"
import { lstat, open, readdir, realpath, rmdir, unlink } from "node:fs/promises"
import { hostname } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { Prisma, PrismaClient } from "@prisma/client"
import prisma from "./prisma"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"

const ROOT_MARKER = ".weblogros-media-root"
const ROOT_MARKER_CONTENT = "weblogros-media-runtime-v1\n"
const RECEIPT_MARKER = ".receipt-owner.json"
const MAX_MARKER_BYTES = 1024
const MIN_AGE_MS = 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VARIANT_DIR = /^variants-[A-Za-z0-9_-]{1,128}$/
const VARIANT_FILE = /^image-[1-9]\d*x[1-9]\d*\.(jpg|png)$/
const ACTIVE_STATES = ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] as const

export type MediaAbandonedCleanupOptions = {
  temporaryRoot: string
  currentOwnerId: string
  getProtectedJobIds: () => readonly string[]
  getActiveReceiptIds: () => readonly string[]
  signal?: AbortSignal
  batchSize?: number
  cursor?: string
}

export type MediaAbandonedCleanupReport = {
  scanned: number
  eligible: number
  cleaned: number
  pending: number
  quarantined: number
  skipped: number
  errors: number
  nextCursor: string | null
  hasMore: boolean
}

type Marker = { jobId: string; runtimeOwnerId: string; receiptToken: string }
type Journal = {
  id: string; jobId: string; runtimeOwnerId: string; receiptToken: string
  temporaryRoot: string; path: string; status: "PENDING" | "COMPLETE"; lastActivityAt: Date
}
type Clock = { now?: () => Date }
type Database = PrismaClient

// 📚 La factory mantiene un reloj controlable para pruebas de caducidad sin permitir que el runtime productivo finja la hora de PostgreSQL.
export function createMediaAbandonedCleanup(clock: Clock = {}) {
  return async function sweepAbandonedMediaFiles(
    options: MediaAbandonedCleanupOptions,
    db: Database = prisma,
  ): Promise<MediaAbandonedCleanupReport> {
    return sweep(options, db, clock.now)
  }
}

// 📚 El barrido separa descubrimiento, prueba durable y borrado para que cada paso falle cerrado ante datos incompletos.
export const sweepAbandonedMediaFiles = createMediaAbandonedCleanup()

async function sweep(options: MediaAbandonedCleanupOptions, db: Database, testClock?: () => Date): Promise<MediaAbandonedCleanupReport> {
  const report: MediaAbandonedCleanupReport = {
    scanned: 0, eligible: 0, cleaned: 0, pending: 0, quarantined: 0,
    skipped: 0, errors: 0, nextCursor: null, hasMore: false,
  }
  const batchSize = Math.min(100, Math.max(1, Math.trunc(options.batchSize ?? 100)))
  const root = resolve(options.temporaryRoot)
  if (!UUID.test(options.currentOwnerId) || !await verifyRoot(root)) {
    report.errors++
    return report
  }

  try {
    // 📚 En producción la hora de PostgreSQL evita depender del reloj potencialmente desfasado del proceso.
    const databaseClock = testClock ? testClock() : (await db.$queryRaw<Array<{ now: Date }>>`SELECT clock_timestamp() AS now`)[0]?.now
    if (!(databaseClock instanceof Date) || Number.isNaN(databaseClock.getTime())) { report.errors++; return report }
    const currentOwner = await db.mediaRuntimeOwner.findUnique({ where: { id: options.currentOwnerId } })
    if (!currentOwner || currentOwner.hostId !== hostname() || resolve(currentOwner.temporaryRoot) !== root
      || currentOwner.processId !== process.pid || currentOwner.closedAt !== null) { report.errors++; return report }

    const rootEntries = await readdir(root)
    // 📚 Los nombres sin identidad de trabajo se conservan y se cuentan para
    // 📚 revisión; no se incorporan a un plan de borrado por parecer temporales.
    if (!options.cursor) report.quarantined += rootEntries.filter((name) => name !== ROOT_MARKER && !UUID.test(name)).length
    const names = rootEntries.filter((name) => UUID.test(name)).sort()
    // 📚 Un único cursor ordena carpetas y journals, evitando que una cola prioritaria deje IDs atrás entre páginas.
    const pending = await db.mediaOrphanCleanup.findMany({ where: { status: "PENDING", temporaryRoot: root }, select: { jobId: true } })
    const candidates = [...new Set([...names, ...pending.map((row) => row.jobId)])].sort()
    const afterCursor = options.cursor ? candidates.filter((name) => name > options.cursor!) : candidates
    const batch = afterCursor.slice(0, batchSize)
    for (const name of batch) {
      if (options.signal?.aborted) break
      report.scanned++
      report.nextCursor = name
      const journal = await db.mediaOrphanCleanup.findUnique({ where: { jobId: name } }) as Journal | null
      const outcome = journal?.status === "PENDING"
        ? await processJournal(journal, options, db, databaseClock)
        : await processWorkspace(root, name, options, db, databaseClock)
      applyOutcome(report, outcome)
    }
    report.hasMore = report.scanned < afterCursor.length
    if (!report.hasMore) report.nextCursor = null
    else if (report.scanned === 0) report.nextCursor = options.cursor ?? null
  } catch {
    report.errors++
  }
  return report
}

type Outcome = "cleaned" | "pending" | "quarantined" | "skipped" | "error" | "eligible"
function applyOutcome(report: MediaAbandonedCleanupReport, outcome: Outcome): void {
  if (outcome === "eligible") report.eligible++
  else if (outcome === "cleaned") { report.eligible++; report.cleaned++ }
  else if (outcome === "pending") { report.eligible++; report.pending++ }
  else if (outcome === "quarantined") report.quarantined++
  else if (outcome === "error") report.errors++
  else report.skipped++
}

// 📚 Un workspace con trabajo activo o referencias ajenas no se adopta como huérfano, aunque su fecha sea antigua.
async function processWorkspace(root: string, name: string, options: MediaAbandonedCleanupOptions, db: Database, now: Date): Promise<Outcome> {
  if (!await currentOwnerIsLive(options.currentOwnerId, root, db)) return "skipped"
  const workspace = join(root, name)
  if (dirname(workspace) !== root || basename(workspace) !== name) return "quarantined"
  const info = await safeDirectory(workspace)
  if (!info) return "quarantined"
  const marker = await readMarker(workspace)
  if (!marker || marker.jobId !== name) return "quarantined"
  if (options.getProtectedJobIds().includes(name)) return "skipped"
  const owner = await db.mediaRuntimeOwner.findUnique({ where: { id: marker.runtimeOwnerId } })
  if (!owner || owner.hostId !== hostname() || resolve(owner.temporaryRoot) !== root || owner.id === options.currentOwnerId) return "skipped"
  if (!owner.closedAt && !isProcessDead(owner.processId)) return "skipped"

  const job = await db.mediaJob.findUnique({ where: { id: name } })
  if (job) {
    if (await findOtherReferences(workspace, db)) return "skipped"
    if (ACTIVE_STATES.includes(job.status as typeof ACTIVE_STATES[number])) return "skipped"
    if (job.runtimeReceiptId && options.getActiveReceiptIds().includes(job.runtimeReceiptId)) return "skipped"
    if (job.runtimeOwnerId !== marker.runtimeOwnerId || job.receiptToken !== marker.receiptToken) return "quarantined"
    if (job.temporaryCleanedAt !== null) return "quarantined"
    if (job.workerPid !== null && !isProcessDead(job.workerPid)) return "skipped"
    if (!(["SUCCEEDED", "FAILED", "CANCELED", "INTERRUPTED"] as string[]).includes(job.status)) return "skipped"
    const activity = await latestWorkspaceActivity(workspace)
    if (!activity || Math.max(activity.getTime(), owner.closedAt?.getTime() ?? 0, job.updatedAt.getTime()) > now.getTime() - MIN_AGE_MS) return "skipped"
    // 📚 El limpiador del job conserva su CAS histórico y solo recibe prueba de muerte del dueño y worker.
    const result = await cleanupTerminalMediaJobTemporaryFiles(name, root, db, { ownerAndWorkerDeadConfirmed: true, signal: options.signal })
    return result.cleaned ? "cleaned" : "pending"
  }

  const referenced = await findOtherReferences(workspace, db)
  if (referenced) return "skipped"
  const journal = await db.mediaOrphanCleanup.findUnique({ where: { jobId: name } }) as Journal | null
  const fileAge = await latestWorkspaceActivity(workspace)
  if (!fileAge) return "quarantined"
  const newest = Math.max(fileAge.getTime(), owner.closedAt?.getTime() ?? 0)

  if (journal?.status === "PENDING") return processJournal(journal, options, db, now)
  if (newest > now.getTime() - MIN_AGE_MS) return "skipped"
  const created = await prepareJournal(root, workspace, marker, owner.id, fileAge, options, db)
  if (!created) return "skipped"
  return processJournal(created, options, db, now)
}

// 📚 El journal se crea bajo el lock compartido con admisión, revalidando job y referencias antes de sacar el I/O del transaction.
async function prepareJournal(root: string, workspace: string, marker: Marker, ownerId: string, activity: Date, options: MediaAbandonedCleanupOptions, db: Database): Promise<Journal | null> {
  try {
    return await db.$transaction(async (tx) => {
      await lockMediaJobCoordination(tx)
      if (options.getProtectedJobIds().includes(marker.jobId)) return null
      if (await tx.mediaJob.findUnique({ where: { id: marker.jobId }, select: { id: true } })) return null
      if (await findOtherReferences(workspace, tx)) return null
      const existing = await tx.mediaOrphanCleanup.findUnique({ where: { jobId: marker.jobId } }) as Journal | null
      // 📚 Reaparecer no transfiere propiedad: el journal anterior solo autoriza
      // 📚 el mismo recibo, dueño y raíz, nunca una carpeta copiada con otro marcador.
      if (existing && (existing.temporaryRoot !== root || existing.path !== workspace
        || existing.runtimeOwnerId !== ownerId || existing.receiptToken !== marker.receiptToken)) return null
      if (existing?.status === "PENDING") return existing
      if (existing?.status === "COMPLETE") {
        return await tx.mediaOrphanCleanup.update({
          where: { id: existing.id }, data: { status: "PENDING", runtimeOwnerId: ownerId, receiptToken: marker.receiptToken,
            temporaryRoot: root, path: workspace, lastActivityAt: activity, completedAt: null, lastErrorCode: null },
        }) as Journal
      }
      return await tx.mediaOrphanCleanup.create({
        data: { id: randomUUID(), jobId: marker.jobId, runtimeOwnerId: ownerId, receiptToken: marker.receiptToken,
          temporaryRoot: root, path: workspace, lastActivityAt: activity },
      }) as Journal
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 5_000, maxWait: 2_000 })
  } catch {
    // 📚 Un fallo/ACK incierto del journal no es simplemente «no elegible»:
    // 📚 el reporte debe registrar error y conservar disco para la próxima pasada.
    throw new Error("MEDIA_ORPHAN_JOURNAL_UNAVAILABLE")
  }
}

// 📚 Cada reanudación vuelve a probar la ruta y el marker; si el marker ya se quitó, solo se admite cerrar un directorio vacío.
async function processJournal(journal: Journal, options: MediaAbandonedCleanupOptions, db: Database, now: Date): Promise<Outcome> {
  const requestedRoot = resolve(options.temporaryRoot)
  if (journal.status !== "PENDING" || journal.temporaryRoot !== resolve(options.temporaryRoot) || resolve(journal.temporaryRoot) !== journal.temporaryRoot
    || resolve(journal.path) !== journal.path || dirname(journal.path) !== journal.temporaryRoot
    || basename(journal.path) !== journal.jobId) return "quarantined"
  if (!await currentOwnerIsLive(options.currentOwnerId, requestedRoot, db)) return "skipped"
  const workspace = journal.path
  const owner = await db.mediaRuntimeOwner.findUnique({ where: { id: journal.runtimeOwnerId } })
  if (!owner || owner.hostId !== hostname() || resolve(owner.temporaryRoot) !== journal.temporaryRoot
    || owner.id === options.currentOwnerId || (!owner.closedAt && !isProcessDead(owner.processId))) return "skipped"
  if (options.getProtectedJobIds().includes(journal.jobId)) return "skipped"
  if (await db.mediaJob.findUnique({ where: { id: journal.jobId } }) || await findOtherReferences(workspace, db)) return "skipped"
  if (!await verifyRoot(journal.temporaryRoot)) return "quarantined"
  const directory = await safeDirectory(workspace)
  if (!directory) {
    if (await isAbsent(workspace)) return await completeJournal(journal, db) ? "cleaned" : "pending"
    return "quarantined"
  }
  let marker = await readMarker(workspace)
  if (marker) {
    if (marker.jobId !== journal.jobId || marker.runtimeOwnerId !== journal.runtimeOwnerId || marker.receiptToken !== journal.receiptToken) return "quarantined"
  } else if ((await readdir(workspace)).length !== 0) return "quarantined"

  // 📚 Un snapshot actualizado por actividad reciente mantiene su plazo en todos
  // 📚 los reintentos, aunque los archivos no hayan vuelto a cambiar desde entonces.
  if (Math.max(journal.lastActivityAt.getTime(), owner.closedAt?.getTime() ?? 0) > now.getTime() - MIN_AGE_MS) return "pending"

  try {
    const entries = await readdir(workspace)
    // 📚 Validar el conjunto completo antes del primer unlink evita borrar input.tmp si existe otro archivo desconocido.
    if (!await validateEntries(workspace, entries)) return "quarantined"
    const activity = await latestOwnedFileActivity(workspace, entries)
    if (activity && activity.getTime() > journal.lastActivityAt.getTime()) {
      const recentlyChanged = activity.getTime() > now.getTime() - MIN_AGE_MS
      if (options.signal?.aborted || !await journalMutationStillSafe(journal, options, db)) return "skipped"
      const changed = await db.mediaOrphanCleanup.updateMany({
        where: { id: journal.id, status: "PENDING" },
        data: { lastActivityAt: activity, lastErrorCode: recentlyChanged ? "ACTIVITY_CHANGED" : null,
          ...(recentlyChanged ? { attempts: { increment: 1 } } : {}) },
      })
      if (changed.count !== 1) return "skipped"
      if (recentlyChanged) return "pending"
    }
    // 📚 Una consulta o actualización puede tardar; repetimos las pruebas justo antes del primer borrado.
    if (options.signal?.aborted || !await journalMutationStillSafe(journal, options, db)) return "skipped"
    for (const name of entries) {
      if (options.signal?.aborted) return "skipped"
      if (name === RECEIPT_MARKER) continue
      if (name === "input.tmp") {
        if (!await journalMutationStillSafe(journal, options, db)) return "skipped"
        if (options.signal?.aborted) return "skipped"
        if (!await unlinkRegularFile(join(workspace, name), options.signal)) return "quarantined"
        continue
      }
      if (VARIANT_DIR.test(name)) {
        if (!await removeVariant(workspace, name, options, db)) return options.signal?.aborted ? "skipped" : "quarantined"
        continue
      }
      return "quarantined"
    }
    // 📚 El marker se retira último: hasta entonces el siguiente intento puede demostrar quién creó este directorio.
    marker = await readMarker(workspace)
    if (marker) {
      if (marker.jobId !== journal.jobId || marker.runtimeOwnerId !== journal.runtimeOwnerId || marker.receiptToken !== journal.receiptToken) return "quarantined"
      if (!await journalMutationStillSafe(journal, options, db)) return "skipped"
      if (options.signal?.aborted) return "skipped"
      await unlink(join(workspace, RECEIPT_MARKER))
    }
    if (options.signal?.aborted || !await journalMutationStillSafe(journal, options, db)) return "skipped"
    await rmdir(workspace)
    return await completeJournal(journal, db) ? "cleaned" : "pending"
  } catch (error) {
    const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "FILESYSTEM_ERROR"
    await recordPendingFailure(journal.id, code, db)
    return code === "ENOTEMPTY" ? "quarantined" : "pending"
  }
}

async function currentOwnerIsLive(id: string, root: string, db: Database): Promise<boolean> {
  const owner = await db.mediaRuntimeOwner.findUnique({ where: { id } })
  return Boolean(owner && owner.hostId === hostname() && resolve(owner.temporaryRoot) === root
    && owner.processId === process.pid && owner.closedAt === null)
}

// 📚 Revalida la propiedad y las referencias después de cualquier espera de BD antes de cambiar disco o estado durable.
async function journalMutationStillSafe(journal: Journal, options: MediaAbandonedCleanupOptions, db: Database): Promise<boolean> {
  if (options.signal?.aborted || options.getProtectedJobIds().includes(journal.jobId)
    || !await currentOwnerIsLive(options.currentOwnerId, journal.temporaryRoot, db)
    || !await verifyRoot(journal.temporaryRoot)) return false
  const previousOwner = await db.mediaRuntimeOwner.findUnique({ where: { id: journal.runtimeOwnerId } })
  if (!previousOwner || previousOwner.id === options.currentOwnerId || previousOwner.hostId !== hostname()
    || resolve(previousOwner.temporaryRoot) !== journal.temporaryRoot
    || (!previousOwner.closedAt && !isProcessDead(previousOwner.processId))) return false
  const current = await db.mediaOrphanCleanup.findUnique({ where: { id: journal.id } }) as Journal | null
  if (!current || current.status !== "PENDING" || current.path !== journal.path
    || current.temporaryRoot !== journal.temporaryRoot || current.runtimeOwnerId !== journal.runtimeOwnerId
    || current.receiptToken !== journal.receiptToken) return false
  if (await db.mediaJob.findUnique({ where: { id: journal.jobId }, select: { id: true } })
    || await findOtherReferences(journal.path, db)) return false
  if (!await safeDirectory(journal.path)) return false
  const entries = await readdir(journal.path)
  const marker = await readMarker(journal.path)
  return marker
    ? marker.jobId === journal.jobId && marker.runtimeOwnerId === journal.runtimeOwnerId && marker.receiptToken === journal.receiptToken
    : entries.length === 0
}

async function completeJournal(journal: Journal, db: Database): Promise<boolean> {
  if (!await isAbsent(journal.path)) return false
  if (await db.mediaJob.findUnique({ where: { id: journal.jobId }, select: { id: true } })
    || await findOtherReferences(journal.path, db)) return false
  const result = await db.mediaOrphanCleanup.updateMany({
    where: { id: journal.id, status: "PENDING" },
    data: { status: "COMPLETE", completedAt: new Date(), lastErrorCode: null },
  })
  return result.count === 1
}

async function recordPendingFailure(id: string, code: string, db: Database): Promise<void> {
  const journal = await db.mediaOrphanCleanup.findUnique({ where: { id } }) as Journal | null
  if (!journal || await db.mediaJob.findUnique({ where: { id: journal.jobId }, select: { id: true } })
    || await findOtherReferences(journal.path, db)) return
  await db.mediaOrphanCleanup.updateMany({ where: { id, status: "PENDING" }, data: { attempts: { increment: 1 }, lastErrorCode: code } })
}

// 📚 Las referencias se comparan como rutas completas y descendientes del workspace para proteger variantes guardadas en columnas distintas.
async function findOtherReferences(workspace: string, db: PrismaClient | Prisma.TransactionClient): Promise<boolean> {
  const prefix = `${workspace}${process.platform === "win32" ? "\\" : "/"}`
  // 📚 starts_with compara texto literal: Prisma startsWith se traduce a LIKE y puede tratar \\ como escape en rutas Windows.
  const rows = await db.$queryRaw<Array<{
    id: string; inputDirectory: string | null; resultDirectory: string | null
    workerDirectory: string | null; cleanupPendingDirectory: string | null
  }>>`
    SELECT "id", "inputDirectory", "resultDirectory", "workerDirectory", "cleanupPendingDirectory"
    FROM "MediaJob"
    WHERE starts_with(lower(COALESCE("inputDirectory", '')), lower(${workspace}))
       OR starts_with(lower(COALESCE("resultDirectory", '')), lower(${workspace}))
       OR starts_with(lower(COALESCE("workerDirectory", '')), lower(${workspace}))
       OR starts_with(lower(COALESCE("cleanupPendingDirectory", '')), lower(${workspace}))
  `
  const normalize = (value: string): string => process.platform === "win32" ? value.toLowerCase() : value
  const normalizedWorkspace = normalize(workspace)
  const normalizedPrefix = normalize(prefix)
  return rows.some((row) => row.id !== basename(workspace) && [row.inputDirectory, row.resultDirectory, row.workerDirectory, row.cleanupPendingDirectory]
    .some((value) => value !== null && (normalize(value) === normalizedWorkspace || normalize(value).startsWith(normalizedPrefix))))
}

async function verifyRoot(root: string): Promise<boolean> {
  try {
    const stat = await lstat(root)
    if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== root) return false
    const markerPath = join(root, ROOT_MARKER)
    const markerStat = await lstat(markerPath)
    if (!markerStat.isFile() || markerStat.isSymbolicLink() || markerStat.size !== ROOT_MARKER_CONTENT.length) return false
    const handle = await open(markerPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.size !== ROOT_MARKER_CONTENT.length) return false
      const buffer = Buffer.alloc(ROOT_MARKER_CONTENT.length + 1)
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
      return bytesRead === ROOT_MARKER_CONTENT.length && buffer.subarray(0, bytesRead).toString("utf8") === ROOT_MARKER_CONTENT
    } finally { await handle.close() }
  } catch { return false }
}

async function safeDirectory(path: string): Promise<boolean> {
  try {
    const stat = await lstat(path)
    return stat.isDirectory() && !stat.isSymbolicLink() && await realpath(path) === path
  } catch (error) { if (isMissing(error)) return false; throw error }
}

async function readMarker(workspace: string): Promise<Marker | null> {
  const path = join(workspace, RECEIPT_MARKER)
  try {
    const before = await lstat(path)
    if (!before.isFile() || before.isSymbolicLink() || before.size <= 0 || before.size > MAX_MARKER_BYTES) return null
    const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    try {
      const opened = await handle.stat()
      if (!opened.isFile() || opened.size <= 0 || opened.size > MAX_MARKER_BYTES) return null
      const buffer = Buffer.alloc(MAX_MARKER_BYTES + 1)
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
      if (bytesRead !== opened.size) return null
      const data = JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")) as Record<string, unknown>
      if (Object.keys(data).sort().join(",") !== "jobId,receiptToken,runtimeOwnerId"
        || typeof data.jobId !== "string" || !UUID.test(data.jobId)
        || typeof data.runtimeOwnerId !== "string" || !UUID.test(data.runtimeOwnerId)
        || typeof data.receiptToken !== "string" || !UUID.test(data.receiptToken)) return null
      return { jobId: data.jobId, runtimeOwnerId: data.runtimeOwnerId, receiptToken: data.receiptToken }
    } finally { await handle.close() }
  } catch { return null }
}

async function latestWorkspaceActivity(workspace: string): Promise<Date | null> {
  try {
    const directoryInfo = await lstat(workspace)
    const times: number[] = [directoryInfo.mtimeMs, directoryInfo.ctimeMs]
    for (const name of await readdir(workspace)) {
      const path = join(workspace, name)
      const info = await lstat(path)
      if (info.isSymbolicLink()) return null
      times.push(info.mtimeMs, info.ctimeMs)
      if (name.startsWith("variants-") && info.isDirectory()) {
        for (const child of await readdir(path)) {
          const childInfo = await lstat(join(path, child))
          if (childInfo.isSymbolicLink()) return null
          times.push(childInfo.mtimeMs, childInfo.ctimeMs)
        }
      }
    }
    return new Date(Math.max(...times))
  } catch { return null }
}

// 📚 El ctime del directorio cambia por nuestros propios unlink; solo los archivos que aún quedan pueden renovar el plazo.
async function latestOwnedFileActivity(workspace: string, entries: string[]): Promise<Date | null> {
  const times: number[] = []
  for (const name of entries) {
    if (name === RECEIPT_MARKER || name === "input.tmp") {
      const stat = await lstat(join(workspace, name))
      if (!stat.isFile() || stat.isSymbolicLink()) return null
      times.push(stat.mtimeMs, stat.ctimeMs)
    } else if (VARIANT_DIR.test(name)) {
      const directory = join(workspace, name)
      for (const file of await readdir(directory)) {
        const stat = await lstat(join(directory, file))
        if (!stat.isFile() || stat.isSymbolicLink()) return null
        times.push(stat.mtimeMs, stat.ctimeMs)
      }
    }
  }
  return times.length === 0 ? null : new Date(Math.max(...times))
}

async function removeVariant(workspace: string, name: string, options: MediaAbandonedCleanupOptions, db: Database): Promise<boolean> {
  const path = join(workspace, name)
  if (!await safeDirectory(path)) return false
  try {
    for (const child of await readdir(path)) {
      if (!VARIANT_FILE.test(child)) return false
    }
    for (const child of await readdir(path)) {
      if (options.signal?.aborted || !await journalMutationStillSafeForDirectory(workspace, options, db)
        || !await unlinkRegularFile(join(path, child), options.signal)) return false
    }
    if (options.signal?.aborted || !await journalMutationStillSafeForDirectory(workspace, options, db)) return false
    await rmdir(path)
    return true
  } catch (error) { if (isMissing(error)) return false; throw error }
}

async function journalMutationStillSafeForDirectory(workspace: string, options: MediaAbandonedCleanupOptions, db: Database): Promise<boolean> {
  const journal = await db.mediaOrphanCleanup.findUnique({ where: { jobId: basename(workspace) } }) as Journal | null
  return Boolean(journal && journal.path === workspace && await journalMutationStillSafe(journal, options, db))
}

async function validateEntries(workspace: string, entries: string[]): Promise<boolean> {
  for (const name of entries) {
    if (name === RECEIPT_MARKER) {
      if (!await readMarker(workspace)) return false
    } else if (name === "input.tmp") {
      if (!await isRegularFile(join(workspace, name))) return false
    } else if (VARIANT_DIR.test(name)) {
      const path = join(workspace, name)
      if (!await safeDirectory(path)) return false
      for (const child of await readdir(path)) {
        if (!VARIANT_FILE.test(child) || !await isRegularFile(join(path, child))) return false
      }
    } else return false
  }
  return true
}

async function isRegularFile(path: string): Promise<boolean> {
  try {
    const info = await lstat(path)
    return info.isFile() && !info.isSymbolicLink() && await realpath(path) === path
  } catch { return false }
}

async function unlinkRegularFile(path: string, signal?: AbortSignal): Promise<boolean> {
  try {
    if (signal?.aborted) return false
    const info = await lstat(path)
    if (signal?.aborted || !info.isFile() || info.isSymbolicLink() || await realpath(path) !== path) return false
    if (signal?.aborted) return false
    await unlink(path)
    return true
  } catch (error) { if (isMissing(error)) return true; throw error }
}

async function isAbsent(path: string): Promise<boolean> {
  try { await lstat(path); return false } catch (error) { return isMissing(error) }
}

function isMissing(error: unknown): boolean { return error instanceof Error && "code" in error && error.code === "ENOENT" }
function isProcessDead(pid: number): boolean {
  if (!Number.isSafeInteger(pid) || pid <= 0 || pid === process.pid) return false
  try { process.kill(pid, 0); return false } catch (error) { return error instanceof Error && "code" in error && error.code === "ESRCH" }
}
