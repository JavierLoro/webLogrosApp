import { hostname } from "node:os"
import { isAbsolute, resolve } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { Prisma, PrismaClient } from "@prisma/client"
import { lstat, realpath } from "node:fs/promises"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { parseImageTarget, imageObjectKey, imageReferenceCount, type ImageTarget } from "./mediaTargets"
import { cleanupMediaAssetCleanup } from "./mediaAssetCleanup"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import { mediaAssetVariantSchema, type MediaPublicationStore } from "./mediaPublication"
import { type MediaRuntimeOwnerRecord } from "./mediaRuntimeOwnership"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"
import prisma from "./prisma"

const ACTIVE_STATES = ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] as const
const PROCESSING_STATES = ["PROCESSING", "PUBLISHING"] as const
const RECOVERY_FAILURE = "RUNTIME_INTERRUPTED"
const WORKER_EXIT_WAIT_MS = 3_000
const PROCESS_CHECK_INTERVAL_MS = 100
const RECOVERY_BATCH_SIZE = 100

export type MediaJobRecoveryOptions = {
  temporaryRoot: string
  previousOwners: readonly MediaRuntimeOwnerRecord[]
  currentOwnerId: string
  getProtectedJobIds: () => readonly string[]
  getActiveReceiptIds: () => readonly string[]
  retryPendingCleanup?: boolean
  recheckCompletedAssets?: boolean
}

export type MediaJobRecoveryReport = {
  ownersConfirmed: number
  candidates: number
  interrupted: number
  skipped: number
  errors: number
  temporaryDirectoriesCleaned: number
  temporaryCleanupPending: number
  assetCleanupComplete: number
  assetCleanupPending: number
}

type RecoveryDatabase = PrismaClient
type RecoveryStore = Pick<MediaPublicationStore, "head" | "delete">
type RecoveryJob = {
  id: string
  ownerId: number
  teamId: number | null
  resourceKey: string
  activeResourceKey: string | null
  status: (typeof ACTIVE_STATES)[number]
  processingSlot: number | null
  executionToken: string | null
  processingStartedAt: Date | null
  runtimeOwnerId: string | null
  runtimeReceiptId: string | null
  workerPid: number | null
  workerDirectory: string | null
  receiptToken: string | null
  receiptStartedAt: Date | null
  executorStartedAt: Date | null
  publisherStartedAt: Date | null
  inputDirectory: string | null
  resultDirectory: string | null
  cleanupPendingDirectory: string | null
  cancelRequestedAt: Date | null
}

const recoveryJobSelect = {
  id: true,
  ownerId: true,
  teamId: true,
  resourceKey: true,
  activeResourceKey: true,
  status: true,
  processingSlot: true,
  executionToken: true,
  processingStartedAt: true,
  runtimeOwnerId: true,
  runtimeReceiptId: true,
  workerPid: true,
  workerDirectory: true,
  receiptToken: true,
  receiptStartedAt: true,
  executorStartedAt: true,
  publisherStartedAt: true,
  inputDirectory: true,
  resultDirectory: true,
  cleanupPendingDirectory: true,
  cancelRequestedAt: true,
} as const

// 📚 Recuperar no reintenta trabajos: marca como interrumpidos solo intentos cuyo dueño y worker ya no pueden escribir.
export async function recoverMediaJobs(
  options: MediaJobRecoveryOptions,
  store: RecoveryStore,
  db: RecoveryDatabase = prisma,
): Promise<MediaJobRecoveryReport> {
  const report: MediaJobRecoveryReport = {
    ownersConfirmed: 0,
    candidates: 0,
    interrupted: 0,
    skipped: 0,
    errors: 0,
    temporaryDirectoriesCleaned: 0,
    temporaryCleanupPending: 0,
    assetCleanupComplete: 0,
    assetCleanupPending: 0,
  }
  const root = await canonicalTemporaryRoot(options.temporaryRoot)
  const owners = await confirmOwners(options, root, db)
  report.ownersConfirmed = owners.previous.size + (owners.current ? 1 : 0)
  if (!owners.current) throw new AppError(503, "No se pudo confirmar el owner actual del runtime multimedia")

  let candidates: RecoveryJob[]
  try {
    const previousOwnerIds = [...owners.previous.keys()]
    const scopes: Prisma.MediaJobWhereInput[] = []
    if (previousOwnerIds.length > 0) {
      scopes.push({ runtimeOwnerId: { in: previousOwnerIds }, status: { in: [...ACTIVE_STATES] } })
    }
    // 📚 El owner actual recupera RECEIVING solo con lease id y PROC/PUB solo si el controller dice que ya no tiene tarea activa.
    scopes.push({
      runtimeOwnerId: options.currentOwnerId,
      status: { in: ["RECEIVING", ...PROCESSING_STATES] },
    })
    candidates = await db.mediaJob.findMany({
      where: { OR: scopes },
      select: recoveryJobSelect,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: RECOVERY_BATCH_SIZE,
    }) as RecoveryJob[]
  } catch (error) {
    throw new AppError(503, "No se pudieron consultar trabajos para recuperar")
  }

  report.candidates = candidates.length
  for (const job of candidates) {
    const isPreviousOwner = job.runtimeOwnerId !== options.currentOwnerId
    const owner = isPreviousOwner ? owners.previous.get(job.runtimeOwnerId ?? "") : owners.current
    if (!owner || !isEligibleState(job, isPreviousOwner, options)) {
      report.skipped += 1
      continue
    }

    if (job.workerPid !== null && !(await waitForWorkerExit(job.workerPid))) {
      report.skipped += 1
      continue
    }
    const outcome = await interruptIfStillOrphaned(job, owner, isPreviousOwner, root, options, db)
    if (outcome === "ERROR") {
      report.errors += 1
      continue
    }
    if (outcome === "SKIPPED") {
      report.skipped += 1
      continue
    }
    report.interrupted += 1
    await cleanTerminalJobTemporaryFiles(job.id, root, db, report, true)
    if (outcome.cleanupId) await runAssetCleanup(outcome.cleanupId, store, db, report)
  }

  // 📚 Si el commit terminal fue confirmado por DB pero su ACK se perdió, el siguiente ciclo limpia su pending sin volver a ejecutar el trabajo.
  const cleanupOwnerIds = [options.currentOwnerId, ...owners.previous.keys()]
  if (options.retryPendingCleanup !== false) {
    await retryTerminalTemporaryCleanup(root, cleanupOwnerIds, [...owners.previous.keys()], db, report)
  }
  // 📚 Los journals pendientes son trabajo barato e idempotente; las revalidaciones HEAD masivas se espacian para controlar coste S3.
  await retryRetiredAssetCleanups(store, cleanupOwnerIds, db, report,
    options.retryPendingCleanup !== false, options.recheckCompletedAssets !== false)
  return report
}

function isEligibleState(job: RecoveryJob, previousOwner: boolean, options: MediaJobRecoveryOptions): boolean {
  if (previousOwner) return true
  try {
    if (job.status === "RECEIVING") {
      return job.runtimeReceiptId !== null && !options.getActiveReceiptIds().includes(job.runtimeReceiptId)
    }
    if (job.status === "PROCESSING" || job.status === "PUBLISHING") {
      return !options.getProtectedJobIds().includes(job.id)
    }
    return false
  } catch {
    return false
  }
}

async function interruptIfStillOrphaned(
  snapshot: RecoveryJob,
  owner: MediaRuntimeOwnerRecord,
  previousOwner: boolean,
  root: string,
  options: MediaJobRecoveryOptions,
  db: RecoveryDatabase,
): Promise<{ kind: "INTERRUPTED"; cleanupId: string | null } | "SKIPPED" | "ERROR"> {
  try {
    return await db.$transaction(async (tx) => {
      await lockMediaJobCoordination(tx)
      const ownerRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "MediaRuntimeOwner" WHERE "id" = ${owner.id}::uuid FOR UPDATE
      `
      const jobRows = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "MediaJob" WHERE "id" = ${snapshot.id}::uuid FOR UPDATE
      `
      if (ownerRows.length !== 1 || jobRows.length !== 1) return "SKIPPED"

      const persistedOwner = await tx.mediaRuntimeOwner.findUnique({ where: { id: owner.id } })
      if (!persistedOwner || !sameOwner(persistedOwner, owner) || persistedOwner.temporaryRoot !== root
        || persistedOwner.hostId !== hostname()) return "SKIPPED"
      if (previousOwner) {
        if (persistedOwner.closedAt === null && isProcessAlive(persistedOwner.processId)) return "SKIPPED"
        if (persistedOwner.closedAt === null && !isProcessDead(persistedOwner.processId)) return "SKIPPED"
      } else if (persistedOwner.id !== options.currentOwnerId || persistedOwner.closedAt !== null
        || persistedOwner.processId !== process.pid) return "SKIPPED"

      // 📚 Los callbacks se vuelven a consultar bajo row lock para cerrar la ventana entre el snapshot del tick y el CAS terminal.
      if (!isEligibleState(snapshot, previousOwner, options)) return "SKIPPED"
      const job = await tx.mediaJob.findUnique({ where: { id: snapshot.id }, select: recoveryJobSelect }) as RecoveryJob | null
      if (!job || !sameRecoveryJob(job, snapshot) || job.runtimeOwnerId !== owner.id
        || job.activeResourceKey !== job.resourceKey || job.status === "QUEUED" && !previousOwner) return "SKIPPED"
      if (job.workerPid !== null && (job.workerPid === process.pid || isProcessAlive(job.workerPid))) return "SKIPPED"

      let cleanupId: string | null = null
      const asset = await tx.mediaAsset.findUnique({
        where: { jobId: job.id },
        select: { id: true, teamId: true, state: true, variants: true, cleanup: { select: { id: true, status: true } } },
      })
      if (asset) {
        // 📚 READY y cualquier referencia inconsistente se conservan; la recuperación nunca inventa SUCCEEDED ni borra un asset posiblemente servido.
        if (job.status !== "PUBLISHING" || asset.state !== "STAGING" || asset.cleanup) return "SKIPPED"
        if (job.teamId === null || asset.teamId !== job.teamId
          || await imageReferenceCount(tx, asset.id) > 0) return "SKIPPED"
        const target = parseImageTarget(job.resourceKey)
        const variants = z.array(mediaAssetVariantSchema).min(1).max(3).safeParse(asset.variants)
        if (!target || target.teamId !== job.teamId || !variants.success
          || !variantsMatchOwnKeys(variants.data, target, job.id)) return "SKIPPED"

        const retired = await tx.mediaAsset.updateMany({ where: { id: asset.id, jobId: job.id, state: "STAGING" }, data: { state: "RETIRED" } })
        if (retired.count !== 1) return "SKIPPED"
        const cleanup = await tx.mediaAssetCleanup.create({
          data: { assetId: asset.id, keys: variants.data.map(({ key }) => key) },
          select: { id: true },
        })
        cleanupId = cleanup.id
      }

      const pendingDirectory = job.cleanupPendingDirectory ?? job.resultDirectory ?? job.workerDirectory ?? job.inputDirectory
      const changed = await tx.mediaJob.updateMany({
        where: recoveryJobWhere(job),
        data: {
          // 📚 Un reinicio no olvida una cancelación ya confirmada en PostgreSQL;
          // 📚 con escritor muerto se puede completar CANCELED sin volver a ejecutar.
          status: job.cancelRequestedAt ? "CANCELED" : "INTERRUPTED",
          activeResourceKey: null,
          processingSlot: null,
          completedAt: new Date(),
          failureCode: job.cancelRequestedAt ? "CANCELED" : RECOVERY_FAILURE,
          cleanupPendingDirectory: pendingDirectory,
          runtimeReceiptId: null,
        },
      })
      if (changed.count !== 1) throw new AppError(409, "La reserva cambió antes de recuperar el trabajo")
      return { kind: "INTERRUPTED", cleanupId }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5_000, maxWait: 2_000 })
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 409) return "SKIPPED"
    // 📚 Una transacción con resultado incierto no autoriza a borrar archivos ni objetos; el siguiente ciclo vuelve a leer el registro.
    return "ERROR"
  }
}

function recoveryJobWhere(job: RecoveryJob): Prisma.MediaJobWhereInput {
  return {
    id: job.id,
    ownerId: job.ownerId,
    teamId: job.teamId,
    resourceKey: job.resourceKey,
    activeResourceKey: job.activeResourceKey,
    status: job.status,
    processingSlot: job.processingSlot,
    executionToken: job.executionToken,
    processingStartedAt: job.processingStartedAt,
    runtimeOwnerId: job.runtimeOwnerId,
    runtimeReceiptId: job.runtimeReceiptId,
    workerPid: job.workerPid,
    workerDirectory: job.workerDirectory,
    receiptToken: job.receiptToken,
    receiptStartedAt: job.receiptStartedAt,
    executorStartedAt: job.executorStartedAt,
    publisherStartedAt: job.publisherStartedAt,
    inputDirectory: job.inputDirectory,
    resultDirectory: job.resultDirectory,
    cleanupPendingDirectory: job.cleanupPendingDirectory,
    cancelRequestedAt: job.cancelRequestedAt,
  }
}

function sameRecoveryJob(left: RecoveryJob, right: RecoveryJob): boolean {
  return left.id === right.id && left.ownerId === right.ownerId && left.teamId === right.teamId
    && left.resourceKey === right.resourceKey && left.activeResourceKey === right.activeResourceKey
    && left.status === right.status && left.processingSlot === right.processingSlot
    && left.executionToken === right.executionToken && sameDate(left.processingStartedAt, right.processingStartedAt)
    && left.runtimeOwnerId === right.runtimeOwnerId && left.runtimeReceiptId === right.runtimeReceiptId
    && left.workerPid === right.workerPid && left.workerDirectory === right.workerDirectory
    && left.receiptToken === right.receiptToken && sameDate(left.receiptStartedAt, right.receiptStartedAt)
    && sameDate(left.executorStartedAt, right.executorStartedAt) && sameDate(left.publisherStartedAt, right.publisherStartedAt)
    && left.inputDirectory === right.inputDirectory && left.resultDirectory === right.resultDirectory
    && left.cleanupPendingDirectory === right.cleanupPendingDirectory
    && sameDate(left.cancelRequestedAt, right.cancelRequestedAt)
}

function variantsMatchOwnKeys(
  variants: z.infer<typeof mediaAssetVariantSchema>[], target: ImageTarget, jobId: string,
): boolean {
  return variants.every(({ key, filename }) => key === imageObjectKey(target, jobId, filename))
}

async function cleanTerminalJobTemporaryFiles(
  jobId: string, root: string, db: RecoveryDatabase, report: MediaJobRecoveryReport,
  ownerAndWorkerDeadConfirmed = false,
): Promise<void> {
  try {
    const result = await cleanupTerminalMediaJobTemporaryFiles(jobId, root, db, { ownerAndWorkerDeadConfirmed })
    if (result.cleaned) report.temporaryDirectoriesCleaned += 1
    else report.temporaryCleanupPending += 1
  } catch {
    report.temporaryCleanupPending += 1
  }
}

async function retryTerminalTemporaryCleanup(
  root: string, ownerIds: string[], previousOwnerIds: string[], db: RecoveryDatabase, report: MediaJobRecoveryReport,
): Promise<void> {
  if (ownerIds.length === 0) return
  try {
    const terminalJobs = await db.mediaJob.findMany({
      where: {
        status: { in: ["SUCCEEDED", "FAILED", "CANCELED", "INTERRUPTED"] },
        runtimeOwnerId: { in: ownerIds },
        temporaryCleanedAt: null,
        OR: [
          { inputDirectory: { not: null } },
          { workerDirectory: { not: null } },
          { resultDirectory: { not: null } },
          { cleanupPendingDirectory: { not: null } },
        ],
      },
      select: { id: true, runtimeOwnerId: true, workerPid: true },
      orderBy: [{ completedAt: "asc" }, { id: "asc" }],
      take: RECOVERY_BATCH_SIZE,
    })
    for (const { id, runtimeOwnerId, workerPid } of terminalJobs) {
      if (workerPid !== null && !(await waitForWorkerExit(workerPid))) {
        report.temporaryCleanupPending += 1
        continue
      }
      const ownerAndWorkerDeadConfirmed = runtimeOwnerId !== null && previousOwnerIds.includes(runtimeOwnerId)
      await cleanTerminalJobTemporaryFiles(id, root, db, report, ownerAndWorkerDeadConfirmed)
    }
  } catch {
    report.errors += 1
  }
}

async function runAssetCleanup(
  cleanupId: string, store: RecoveryStore, db: RecoveryDatabase, report: MediaJobRecoveryReport,
): Promise<void> {
  try {
    const result = await cleanupMediaAssetCleanup(cleanupId, store, db)
    if (result.status === "COMPLETE") report.assetCleanupComplete += 1
    else report.assetCleanupPending += 1
  } catch {
    report.assetCleanupPending += 1
  }
}

async function retryRetiredAssetCleanups(
  store: RecoveryStore, ownerIds: string[], db: RecoveryDatabase, report: MediaJobRecoveryReport,
  retryPendingCleanup: boolean, recheckCompletedAssets: boolean,
): Promise<void> {
  if (ownerIds.length === 0) return
  try {
    // 📚 Pendientes se procesan aparte para que un histórico grande de COMPLETE no los tape con el límite de lote.
    const pending = retryPendingCleanup ? await db.mediaAssetCleanup.findMany({
      where: { status: "PENDING", asset: { is: { state: "RETIRED", job: { is: { runtimeOwnerId: { in: ownerIds } } } } } },
      select: { id: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: RECOVERY_BATCH_SIZE,
    }) : []
    for (const cleanup of pending) await runAssetCleanup(cleanup.id, store, db, report)
    if (recheckCompletedAssets) {
      const completed = await db.mediaAssetCleanup.findMany({
        where: { status: "COMPLETE", asset: { is: { state: "RETIRED", job: { is: { runtimeOwnerId: { in: ownerIds } } } } } },
        select: { id: true },
        orderBy: [{ completedAt: "asc" }, { id: "asc" }],
        take: RECOVERY_BATCH_SIZE,
      })
      for (const cleanup of completed) await runAssetCleanup(cleanup.id, store, db, report)
    }
  } catch {
    report.errors += 1
  }
}

async function confirmOwners(
  options: MediaJobRecoveryOptions, root: string, db: RecoveryDatabase,
): Promise<{ current: MediaRuntimeOwnerRecord | null; previous: Map<string, MediaRuntimeOwnerRecord> }> {
  const previous = new Map<string, MediaRuntimeOwnerRecord>()
  let current: MediaRuntimeOwnerRecord | null = null
  const ids = [...new Set([options.currentOwnerId, ...options.previousOwners.map(({ id }) => id)])]
  try {
    const persisted = await db.mediaRuntimeOwner.findMany({ where: { id: { in: ids } } })
    const byId = new Map(persisted.map((owner) => [owner.id, owner as MediaRuntimeOwnerRecord]))
    const active = byId.get(options.currentOwnerId)
    if (active && active.hostId === hostname() && active.processId === process.pid
      && active.temporaryRoot === root && active.closedAt === null) current = active

    for (const supplied of options.previousOwners) {
      if (supplied.id === options.currentOwnerId || supplied.hostId !== hostname() || supplied.temporaryRoot !== root) continue
      const actual = byId.get(supplied.id)
      if (!actual || !sameOwner(actual, supplied) || actual.hostId !== hostname() || actual.temporaryRoot !== root) continue
      if (actual.closedAt === null && (actual.processId === process.pid || isProcessAlive(actual.processId))) continue
      if (actual.closedAt === null && !isProcessDead(actual.processId)) continue
      previous.set(actual.id, actual)
    }
  } catch {
    throw new AppError(503, "No se pudieron confirmar los owners multimedia")
  }
  return { current, previous }
}

function sameOwner(left: MediaRuntimeOwnerRecord, right: MediaRuntimeOwnerRecord): boolean {
  return left.id === right.id && left.hostId === right.hostId && left.processId === right.processId
    && left.temporaryRoot === right.temporaryRoot && sameDate(left.startedAt, right.startedAt)
    && sameDate(left.closedAt, right.closedAt)
}

function sameDate(left: Date | null, right: Date | null): boolean {
  return left === null || right === null ? left === right : left.getTime() === right.getTime()
}

async function canonicalTemporaryRoot(temporaryRoot: string): Promise<string> {
  if (!temporaryRoot || !isAbsolute(temporaryRoot)) throw new AppError(500, "La raíz multimedia no es válida")
  const root = resolve(temporaryRoot)
  try {
    const info = await lstat(root)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(root) !== root) throw new Error("INVALID_ROOT")
    return root
  } catch {
    throw new AppError(503, "No se pudo verificar la raíz temporal multimedia")
  }
}

async function waitForWorkerExit(processId: number): Promise<boolean> {
  if (!Number.isSafeInteger(processId) || processId <= 0 || processId === process.pid) return false
  const deadline = Date.now() + WORKER_EXIT_WAIT_MS
  do {
    if (isProcessDead(processId)) return true
    if (Date.now() >= deadline) return false
    await delay(PROCESS_CHECK_INTERVAL_MS)
  } while (true)
}

function isProcessDead(processId: number): boolean {
  if (!Number.isSafeInteger(processId) || processId <= 0) return false
  try {
    process.kill(processId, 0)
    return false
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "ESRCH"
  }
}

function isProcessAlive(processId: number): boolean {
  return !isProcessDead(processId)
}
