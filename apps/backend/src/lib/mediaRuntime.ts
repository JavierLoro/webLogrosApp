import { randomUUID } from "node:crypto"
import { chmod, lstat, mkdir, open, readFile, readdir, realpath, statfs } from "node:fs/promises"
import { basename, isAbsolute, join, parse, relative, resolve, sep } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "../errors/AppError"
import {
  MEDIA_MAX_IN_FLIGHT_BYTES,
  MEDIA_MIN_FREE_BYTES,
  MEDIA_POLL_INTERVAL_MS,
  MEDIA_TEMP_ROOT_MAX_BYTES,
  mediaRuntimeEnvFromProcess,
} from "../config/mediaEnv"
import { ObjectStore } from "./objectStore"
import { MediaJobController } from "./mediaJobController"
import type { MediaPublicationStore } from "./mediaPublication"
import { recoverMediaJobs } from "./mediaJobRecovery"
import { sweepAbandonedMediaFiles } from "./mediaAbandonedCleanup"
import { withMediaRuntimeOwner } from "./mediaRuntimeContext"
import { acquireMediaRuntimeOwnership, type MediaRuntimeOwnership } from "./mediaRuntimeOwnership"
import prisma from "./prisma"

const ROOT_MARKER = ".weblogros-media-root"
const ROOT_MARKER_CONTENT = "weblogros-media-runtime-v1\n"
const JOB_DIRECTORY = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const INPUT_FILE = "input.tmp"
const RECEIPT_OWNER_MARKER = ".receipt-owner.json"
const MAX_RECEIPT_MARKER_BYTES = 1_024
const VARIANT_FILE = /^image-[1-9]\d*x[1-9]\d*\.(jpg|png)$/
const MAX_INPUT_BYTES = 10_000_000
const MAX_OUTPUT_BYTES = 20_000_000
const ACTIVE_JOB_LIMIT = 12
const ORPHAN_RECOVERY_INTERVAL_MS = 2_000
const PENDING_CLEANUP_INTERVAL_MS = 60_000
const COMPLETED_ASSET_RECHECK_INTERVAL_MS = 60 * 60_000
const ABANDONED_MEDIA_BATCH_SIZE = 100
const PREFLIGHT_KEY_PREFIX = "_weblogros/runtime-preflight/"

type RuntimeObjectStore = MediaPublicationStore & { destroy(): void }

export type MediaRuntimePort = {
  readonly ownerId: string
  readonly temporaryRoot: string
  readonly store: MediaPublicationStore
  readonly allowedOrigins: readonly string[]
  wake(): void
  accepting(): boolean
  acquireReceipt(): Promise<{
    id: string
    signal: AbortSignal
    release(): void
    runOwned<T>(callback: () => Promise<T>): Promise<T>
  }>
}

export type MediaRuntimeDependencies = {
  temporaryRoot: string
  store: RuntimeObjectStore
  allowedOrigins?: string[]
  db?: PrismaClient
  pollIntervalMs?: number
  connectionString?: string
  onError?: (error: unknown, jobId?: string) => void
}

type ReceiptLease = {
  id: string
  abort: AbortController
  drained: Promise<void>
  activeOwned: number
  releaseRequested: boolean
  resolveDrained(): void
  release(): void
}

// 📚 El runtime es el composition root del flujo multimedia: conserva una sola
// 📚 conexión S3, coordina leases de recepción y no arranca por el mero import.
export class MediaRuntime implements MediaRuntimePort {
  readonly ownerId: string
  readonly temporaryRoot: string
  readonly store: MediaPublicationStore
  readonly allowedOrigins: readonly string[]
  private readonly ownedStore: RuntimeObjectStore
  private readonly db: PrismaClient
  private readonly controller: MediaJobController
  private readonly onError: (error: unknown, jobId?: string) => void
  private readonly ownership: MediaRuntimeOwnership
  private readonly maintenanceAbort = new AbortController()
  private readonly receipts = new Set<ReceiptLease>()
  private pollTimer: NodeJS.Timeout | null = null
  private currentPoll: Promise<void> | null = null
  private lastOrphanRecoveryAt = 0
  private lastPendingCleanupAt = 0
  private lastCompletedAssetRecheckAt = 0
  private lastAbandonedSweepAt = 0
  private abandonedSweepCursor: string | undefined
  private abandonedSweepHasMore = false
  private stopPromise: Promise<void> | null = null
  private lockLossStop: Promise<void> | null = null
  private stopping = false
  private stopped = false
  private storeDestroyed = false

  private constructor(
    root: string,
    dependencies: MediaRuntimeDependencies,
    db: PrismaClient,
    ownership: MediaRuntimeOwnership,
  ) {
    this.ownerId = ownership.owner.id
    this.temporaryRoot = root
    this.ownedStore = dependencies.store
    this.store = dependencies.store
    this.allowedOrigins = Object.freeze([...(dependencies.allowedOrigins ?? [])])
    this.db = db
    this.ownership = ownership
    this.onError = dependencies.onError ?? reportSafeRuntimeError
    this.controller = new MediaJobController({
      temporaryRoot: root,
      store: dependencies.store,
      db,
      runtimeOwnerId: this.ownerId,
      onError: this.onError,
    })
  }

  static async create(dependencies: MediaRuntimeDependencies): Promise<MediaRuntime> {
    const db = dependencies.db ?? prisma
    let ownership: MediaRuntimeOwnership | null = null
    let candidate: MediaRuntime | null = null
    try {
      if (!Number.isInteger(dependencies.pollIntervalMs ?? MEDIA_POLL_INTERVAL_MS)
        || (dependencies.pollIntervalMs ?? MEDIA_POLL_INTERVAL_MS) < 100
        || (dependencies.pollIntervalMs ?? MEDIA_POLL_INTERVAL_MS) > 60_000) {
        throw new AppError(500, "El intervalo de procesamiento multimedia no es válido")
      }
      const root = await preparePrivateTemporaryRoot(dependencies.temporaryRoot)
      ownership = await acquireMediaRuntimeOwnership({
        db,
        temporaryRoot: root,
        connectionString: dependencies.connectionString,
      })
      const createdRuntime = new MediaRuntime(root, dependencies, db, ownership)
      candidate = createdRuntime
      ownership.onLockLost(() => createdRuntime.handleLockLoss())
      await verifyDatabaseAndStore(db, dependencies.store)
      if (!candidate.accepting()) throw new AppError(503, "Se perdió el lock durante el arranque del runtime multimedia")
      await candidate.recover({ retryPendingCleanup: true, recheckCompletedAssets: true })
      candidate.markStartupRecoveryComplete()
      do {
        await candidate.runAbandonedSweep(true)
      } while (candidate.abandonedSweepHasMore && candidate.accepting())
      if (!candidate.accepting()) throw new AppError(503, "Se perdió el lock durante el arranque del runtime multimedia")
      await assertTemporaryCapacity(root, db)
      if (!candidate.accepting()) throw new AppError(503, "Se perdió el lock durante el arranque del runtime multimedia")
      candidate.startPolling(dependencies.pollIntervalMs ?? MEDIA_POLL_INTERVAL_MS)
      if (!candidate.accepting()) throw new AppError(503, "Se perdió el lock durante el arranque del runtime multimedia")
      return candidate
    } catch (error) {
      if (candidate) {
        try { await candidate.stop() } catch { /* preserva error original */ }
      } else if (ownership) {
        try { await ownership.closeGracefully() } catch { /* preserva error original */ }
      }
      if (!candidate) {
        try { dependencies.store.destroy() } catch { /* El error de arranque original conserva su contexto seguro. */ }
      }
      throw error
    }
  }

  accepting(): boolean {
    return !this.stopping && !this.stopped
  }

  // 📚 El lease se adquiere antes de admitir o consumir el stream; stop aborta
  // 📚 esos mismos signals y espera release antes de cerrar el almacén.
  async acquireReceipt(): Promise<{
    id: string
    signal: AbortSignal
    release(): void
    runOwned<T>(callback: () => Promise<T>): Promise<T>
  }> {
    if (!this.accepting()) throw new AppError(503, "La recepción de imágenes está detenida")
    const abort = new AbortController()
    let resolveDrained!: () => void
    const drained = new Promise<void>((resolveDrain) => { resolveDrained = resolveDrain })
    const id = randomUUID()
    const lease: ReceiptLease = {
      id,
      abort,
      drained,
      activeOwned: 0,
      releaseRequested: false,
      resolveDrained,
      release: () => {
        if (lease.releaseRequested) return
        lease.releaseRequested = true
        this.finishLeaseWhenDrained(lease)
      },
    }
    this.receipts.add(lease)

    try {
      // 📚 La capacidad combina bytes presentes y el peor caso contractual de 12
      // 📚 trabajos; no depende de que este proceso sea el único futuro runtime.
      await assertTemporaryCapacity(
        this.temporaryRoot,
        this.db,
        this.ownerId,
        [...this.receipts].map((receipt) => receipt.id),
      )
      if (!this.accepting() || abort.signal.aborted) throw new AppError(503, "La recepción de imágenes está detenida")
      return {
        id,
        signal: abort.signal,
        release: lease.release,
        runOwned: async <T>(callback: () => Promise<T>): Promise<T> => {
          if (lease.releaseRequested || !this.accepting() || abort.signal.aborted) {
            throw new AppError(503, "La recepción de imágenes está detenida")
          }
          lease.activeOwned += 1
          try {
            return await withMediaRuntimeOwner(this.ownerId, callback, lease.id)
          } finally {
            lease.activeOwned -= 1
            this.finishLeaseWhenDrained(lease)
          }
        },
      }
    } catch (error) {
      lease.release()
      throw error
    }
  }

  // 📚 Wake coalesce con el poll activo; el tick del controller tiene su propio
  // 📚 guard contra solapamiento por si el scheduler y HTTP despiertan juntos.
  wake(): void {
    if (!this.accepting()) return
    this.poll()
  }

  async stop(beforeStoreDestroy?: () => Promise<void>): Promise<void> {
    if (this.stopped) return
    if (this.stopPromise) return this.stopPromise
    if (this.lockLossStop) {
      await this.lockLossStop
      if (this.stopped) return
    }
    this.stopping = true
    this.maintenanceAbort.abort()
    this.stopPromise = (async () => {
      if (this.pollTimer) clearInterval(this.pollTimer)
      this.pollTimer = null
      for (const receipt of this.receipts) receipt.abort.abort()
      await Promise.allSettled([...this.receipts].map(({ drained }) => drained))
      try {
        await this.controller.stop()
        await this.currentPoll
        // 📚 El server puede cerrar peticiones de lectura ya admitidas mientras
        // 📚 el cliente S3 sigue vivo; solo entonces soltamos la conexión del SDK.
        await beforeStoreDestroy?.()
      } finally {
        try {
          this.destroyStoreOnce()
          await this.ownership.closeGracefully()
        } finally {
          this.stopped = true
          if (activeRuntime === this) activeRuntime = null
        }
      }
    })()
    return this.stopPromise
  }

  private startPolling(intervalMs: number): void {
    if (!this.accepting()) throw new AppError(503, "El runtime multimedia perdió su lock antes de iniciar polling")
    this.pollTimer = setInterval(() => this.poll(), intervalMs)
    this.pollTimer.unref()
    if (!this.accepting()) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
      throw new AppError(503, "El runtime multimedia perdió su lock antes de iniciar polling")
    }
    this.poll()
  }

  private poll(): void {
    if (!this.accepting() || this.currentPoll) return
    const now = Date.now()
    const shouldRecoverOrphans = now - this.lastOrphanRecoveryAt >= ORPHAN_RECOVERY_INTERVAL_MS
    const retryPendingCleanup = now - this.lastPendingCleanupAt >= PENDING_CLEANUP_INTERVAL_MS
    const recheckCompletedAssets = now - this.lastCompletedAssetRecheckAt >= COMPLETED_ASSET_RECHECK_INTERVAL_MS
    if (shouldRecoverOrphans) {
      // 📚 Se agenda por intento y no por éxito para que un S3 degradado no
      // 📚 convierta el poll normal de 500 ms en un barrido repetido sin pausa.
      this.lastOrphanRecoveryAt = now
      if (retryPendingCleanup) this.lastPendingCleanupAt = now
      if (recheckCompletedAssets) this.lastCompletedAssetRecheckAt = now
    }
    const poll = (shouldRecoverOrphans
      ? this.recover({ retryPendingCleanup, recheckCompletedAssets })
      : Promise.resolve())
      .catch((error: unknown) => reportSafeRuntimeError(error))
      .then(() => this.runAbandonedSweep(false))
      .catch((error: unknown) => this.onError(error))
      .then(() => this.reconcileReceiptCancellations())
      .catch((error: unknown) => reportSafeRuntimeError(error))
      .then(() => this.controller.tick())
      .then(() => undefined)
      .catch((error: unknown) => reportSafeRuntimeError(error))
      .finally(() => {
        if (this.currentPoll === poll) this.currentPoll = null
      })
    this.currentPoll = poll
  }

  // 📚 El barrido avanza un lote por poll para limitar el trabajo de cada tick;
  // 📚 en el arranque se drena el backlog antes de comprobar la capacidad del root.
  private async runAbandonedSweep(startup: boolean): Promise<void> {
    if (!this.accepting() || this.maintenanceAbort.signal.aborted) return
    const now = Date.now()
    if (!startup && !this.abandonedSweepHasMore
      && now - this.lastAbandonedSweepAt < COMPLETED_ASSET_RECHECK_INTERVAL_MS) return

    // 📚 Reservamos el turno antes del await para que un fallo no dispare reintentos
    // 📚 en cada poll; el barrido nuevo se reintentará en el siguiente intervalo.
    if (!this.abandonedSweepHasMore) this.lastAbandonedSweepAt = now
    const report = await sweepAbandonedMediaFiles({
      temporaryRoot: this.temporaryRoot,
      currentOwnerId: this.ownerId,
      getProtectedJobIds: () => this.controller.getActiveJobIds(),
      getActiveReceiptIds: () => [...this.receipts]
        .filter((receipt) => receipt.activeOwned > 0)
        .map((receipt) => receipt.id),
      signal: this.maintenanceAbort.signal,
      batchSize: ABANDONED_MEDIA_BATCH_SIZE,
      cursor: this.abandonedSweepCursor,
    }, this.db)
    if (!this.accepting() || this.maintenanceAbort.signal.aborted) return
    this.abandonedSweepCursor = report.hasMore ? report.nextCursor ?? undefined : undefined
    this.abandonedSweepHasMore = report.hasMore
    if (!report.hasMore) this.lastAbandonedSweepAt = Date.now()
    if (report.errors > 0) this.onError(new Error("AbandonedMediaSweepErrors"))
    if (report.quarantined > 0) {
      console.warn("Abandoned media files quarantined", { count: report.quarantined })
    }
  }

  // 📚 El lease local conserva el cierre físico del stream; el flag durable solo
  // 📚 aborta su señal y la ruta HTTP espera el drenaje antes de soltarlo.
  private async reconcileReceiptCancellations(): Promise<void> {
    const receipts = [...this.receipts]
    if (receipts.length === 0) return
    const requested = await this.db.mediaJob.findMany({
      where: {
        runtimeOwnerId: this.ownerId,
        runtimeReceiptId: { in: receipts.map(({ id }) => id) },
        cancelRequestedAt: { not: null },
        status: "RECEIVING",
      },
      select: { runtimeReceiptId: true },
    })
    const canceledIds = new Set(requested.map(({ runtimeReceiptId }) => runtimeReceiptId).filter((id): id is string => id !== null))
    for (const receipt of receipts) if (canceledIds.has(receipt.id)) receipt.abort.abort()
  }

  // 📚 El reconciliador recibe listas vivas, no un snapshot viejo, para que un
  // 📚 trabajo o receipt local nunca se limpie mientras su ejecución sigue dentro del proceso.
  private async recover(options: { retryPendingCleanup: boolean; recheckCompletedAssets: boolean }): Promise<void> {
    await recoverMediaJobs({
      temporaryRoot: this.temporaryRoot,
      previousOwners: [...this.ownership.previousOwners],
      currentOwnerId: this.ownerId,
      getProtectedJobIds: () => this.controller.getActiveJobIds(),
      getActiveReceiptIds: () => [...this.receipts]
        .filter((receipt) => receipt.activeOwned > 0)
        .map((receipt) => receipt.id),
      retryPendingCleanup: options.retryPendingCleanup,
      recheckCompletedAssets: options.recheckCompletedAssets,
    }, this.store, this.db)
  }

  private markStartupRecoveryComplete(): void {
    const now = Date.now()
    this.lastOrphanRecoveryAt = now
    this.lastPendingCleanupAt = now
    this.lastCompletedAssetRecheckAt = now
  }

  // 📚 Perder la conexión que sostiene el lock invalida la exclusividad; el runtime
  // 📚 deja de admitir trabajo y no intenta recuperar liderazgo en caliente.
  private handleLockLoss(): void {
    if (this.stopping || this.stopped) return
    this.stopping = true
    this.maintenanceAbort.abort()
    if (this.pollTimer) clearInterval(this.pollTimer)
    this.pollTimer = null
    for (const receipt of this.receipts) receipt.abort.abort()
    this.lockLossStop = (async () => {
      await Promise.allSettled([...this.receipts].map(({ drained }) => drained))
      await this.controller.stop()
      await this.currentPoll
      // 📚 La sesión de exclusión ya no es confiable: cerramos recursos y
      // 📚 dejamos el owner sin closedAt para que la siguiente instancia no lo suponga drenado.
      this.destroyStoreOnce()
      try { await this.ownership.closeGracefully() } catch { /* el lock ya se perdió; conservar owner abierto */ }
      this.stopped = true
      if (activeRuntime === this) activeRuntime = null
    })().catch((error: unknown) => reportSafeRuntimeError(error))
  }

  private destroyStoreOnce(): void {
    if (this.storeDestroyed) return
    this.storeDestroyed = true
    this.ownedStore.destroy()
  }

  private finishLeaseWhenDrained(lease: ReceiptLease): void {
    if (!lease.releaseRequested || lease.activeOwned > 0 || !this.receipts.has(lease)) return
    this.receipts.delete(lease)
    lease.resolveDrained()
  }
}

let activeRuntime: MediaRuntime | null = null
let runtimeStarting = false

// 📚 Tests pueden inyectar dobles sin cambiar el singleton del servidor; la
// 📚 factory solo devuelve un runtime ya validado y con polling explícito activo.
export async function createMediaRuntime(dependencies: MediaRuntimeDependencies): Promise<MediaRuntime> {
  return MediaRuntime.create(dependencies)
}

// 📚 El bootstrap crea S3 solo cuando MEDIA_ENABLED=true; disabled evita exigir
// 📚 secretos o tocar disco/DB en el backend legado.
export async function startMediaRuntimeFromEnv(db: PrismaClient = prisma): Promise<MediaRuntime | null> {
  if (activeRuntime || runtimeStarting) throw new AppError(409, "El runtime multimedia ya está iniciado")
  runtimeStarting = true
  try {
    const config = mediaRuntimeEnvFromProcess()
    if (!config.enabled) return null
    if (!config.objectStore) throw new AppError(500, "Falta configuración del almacén multimedia")
    const store = new ObjectStore(config.objectStore)
    const runtime = await createMediaRuntime({
      temporaryRoot: config.temporaryRoot!,
      allowedOrigins: config.allowedOrigins,
      store,
      db,
      pollIntervalMs: MEDIA_POLL_INTERVAL_MS,
    })
    if (!runtime.accepting()) {
      await runtime.stop()
      throw new AppError(503, "El runtime multimedia perdió su lock durante el bootstrap")
    }
    activeRuntime = runtime
    return runtime
  } catch (error) {
    throw error
  } finally {
    runtimeStarting = false
  }
}

// 📚 La ruta consulta el runtime activo en cada petición para que el montaje no
// 📚 capture un valor null antes de que el servidor termine su bootstrap.
export function getMediaRuntime(): MediaRuntimePort | null {
  return activeRuntime?.accepting() ? activeRuntime : null
}

// 📚 El marcador exclusivo hace que una ruta reutilizada se reconozca como propia;
// 📚 canonicalidad y permisos impiden escribir bajo una carpeta compartida o symlink.
async function preparePrivateTemporaryRoot(candidate: string): Promise<string> {
  if (!candidate || !isAbsolute(candidate)) throw new AppError(500, "MEDIA_TEMP_ROOT debe ser absoluta")
  const requested = resolve(candidate)
  const foldedPath = requested.toLowerCase().split(/[\\/]+/)
  if (foldedPath.includes("node_modules") || requested === parse(requested).root
    || isParentOfApplication(requested)) {
    throw new AppError(500, "MEDIA_TEMP_ROOT debe ser un directorio dedicado fuera de node_modules")
  }

  try {
    await mkdir(requested, { recursive: true, mode: 0o700 })
    const info = await lstat(requested)
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(requested) !== requested) {
      throw new Error("NON_CANONICAL_MEDIA_ROOT")
    }
    await chmod(requested, 0o700)
    const markerPath = join(requested, ROOT_MARKER)
    try {
      const markerInfo = await lstat(markerPath)
      if (!markerInfo.isFile() || markerInfo.isSymbolicLink()
        || await readFile(markerPath, "utf8") !== ROOT_MARKER_CONTENT) {
        throw new Error("INVALID_MEDIA_ROOT_MARKER")
      }
    } catch (error) {
      if (!isMissing(error)) throw error
      const entries = await readdir(requested)
      if (entries.length > 0) throw new Error("MEDIA_ROOT_NOT_EXCLUSIVE")
      const marker = await open(markerPath, "wx", 0o600)
      try { await marker.writeFile(ROOT_MARKER_CONTENT, "utf8") } finally { await marker.close() }
    }
    return requested
  } catch (error) {
    throw safeRuntimeError("No se pudo preparar el directorio temporal privado", error)
  }
}

// 📚 Un root padre de la aplicación podría abarcar código o datos ajenos al runtime.
function isParentOfApplication(path: string): boolean {
  const appPath = resolve(process.cwd()).toLowerCase()
  const rootPath = path.toLowerCase()
  const relativePath = relative(rootPath, appPath)
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath))
}

// 📚 Las comprobaciones de arranque detectan esquema/permisos antes de aceptar
// 📚 imágenes; el objeto aleatorio de S3 se borra antes de abrir el listener.
async function verifyDatabaseAndStore(db: PrismaClient, store: RuntimeObjectStore): Promise<void> {
  try {
    // 📚 Lecturas ligeras validan que la migración y la bucket policy necesarias
    // 📚 existen antes de abrir aceptación; no se crea ni actualiza ninguna fila.
    await Promise.all([db.mediaJob.count(), db.mediaAsset.count(), db.mediaOrphanCleanup.count()])
  } catch (error) {
    throw safeRuntimeError("El esquema multimedia de PostgreSQL no está disponible", error)
  }

  const key = `${PREFLIGHT_KEY_PREFIX}${randomUUID()}`
  let putAttempted = false
  try {
    putAttempted = true
    await store.put(key, new Uint8Array([0]), "application/octet-stream")
    const saved = await store.head(key)
    if (!saved || saved.contentLength !== 1) throw new Error("PREFLIGHT_OBJECT_MISSING")
  } catch (error) {
    throw safeRuntimeError("El bucket de imágenes no supera la comprobación de acceso", error)
  } finally {
    if (putAttempted) {
      try {
        await store.delete(key)
        if (await store.head(key) !== null) throw new Error("PREFLIGHT_OBJECT_REMAINS")
      } catch (error) {
        throw safeRuntimeError("No se pudo retirar el objeto temporal de comprobación", error)
      }
    }
  }
}

// 📚 Rechazamos antes de admitir si el uso actual más el peor caso global supera
// 📚 el presupuesto, o si el sistema perdería el margen libre fuera del root.
async function assertTemporaryCapacity(
  root: string,
  db: PrismaClient,
  ownerId?: string,
  receiptIds: string[] = [],
): Promise<void> {
  const usage = await measureTemporaryUsage(root)
  let activeJobs: number
  let representedLeases = 0
  try {
    const activeFilter: Prisma.MediaJobWhereInput = {
      status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] },
    }
    activeJobs = await db.mediaJob.count({ where: activeFilter })
    if (ownerId && receiptIds.length > 0) {
      representedLeases = await db.mediaJob.count({
        where: {
          ...activeFilter,
          runtimeOwnerId: ownerId,
          runtimeReceiptId: { in: receiptIds },
        },
      })
    }
  } catch (error) {
    throw safeRuntimeError("No se pudo comprobar la capacidad de imágenes", error)
  }
  const unpersistedReceipts = Math.max(0, receiptIds.length - representedLeases)
  if (activeJobs + unpersistedReceipts > ACTIVE_JOB_LIMIT) {
    throw new AppError(503, "La cola y las recepciones activas alcanzaron su límite configurado")
  }

  const reservationBytes = MEDIA_MAX_IN_FLIGHT_BYTES
  if (usage + reservationBytes > MEDIA_TEMP_ROOT_MAX_BYTES) {
    throw new AppError(507, "El directorio temporal de imágenes alcanzó su presupuesto de seguridad")
  }
  try {
    const disk = await statfs(root)
    const freeBytes = disk.bavail * disk.bsize
    if (freeBytes < MEDIA_MIN_FREE_BYTES + reservationBytes) {
      throw new AppError(507, "No hay espacio libre suficiente para recibir imágenes con seguridad")
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw safeRuntimeError("No se pudo comprobar el espacio libre del disco", error)
  }
}

// 📚 El recorrido no sigue symlinks y solo cuenta los nombres que produce recepción
// 📚 y Sharp; un archivo inesperado bloquea admisiones sin borrarlo ni ocultarlo.
async function measureTemporaryUsage(root: string): Promise<number> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await scanTemporaryUsage(root)
    } catch (error) {
      // 📚 ENOENT puede ser una limpieza terminal que ganó entre readdir y lstat;
      // 📚 repetimos una vez para obtener una foto coherente sin relajar symlink checks.
      if (isMissing(error) && attempt === 0) continue
      throw safeRuntimeError("El directorio temporal contiene archivos desconocidos o inválidos", error)
    }
  }
  throw new AppError(503, "No se pudo medir el directorio temporal de imágenes")
}

// 📚 Una pasada separada deja que el caller repita solo una snapshot interrumpida
// 📚 por una retirada concurrente; el recorrido nunca cambia el filesystem.
async function scanTemporaryUsage(root: string): Promise<number> {
  let total = 0
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.name === ROOT_MARKER) continue
    const directory = join(root, entry.name)
    const info = await lstat(directory)
    if (!JOB_DIRECTORY.test(entry.name) || !info.isDirectory() || info.isSymbolicLink()
      || await realpath(directory) !== directory) throw new Error("UNKNOWN_MEDIA_ROOT_ENTRY")

    let inputBytes = 0
    let outputBytes = 0
    let markerBytes = 0
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const childPath = join(directory, child.name)
      const childInfo = await lstat(childPath)
      if (child.name === RECEIPT_OWNER_MARKER) {
        if (!childInfo.isFile() || childInfo.isSymbolicLink() || childInfo.size <= 0
          || childInfo.size > MAX_RECEIPT_MARKER_BYTES) throw new Error("INVALID_RECEIPT_OWNER_MARKER")
        markerBytes += childInfo.size
        continue
      }
      if (child.name === INPUT_FILE && childInfo.isFile() && !childInfo.isSymbolicLink()) {
        inputBytes += childInfo.size
        continue
      }
      if (!child.name.startsWith("variants-") || !childInfo.isDirectory() || childInfo.isSymbolicLink()
        || await realpath(childPath) !== childPath) throw new Error("UNKNOWN_MEDIA_JOB_ENTRY")
      for (const variant of await readdir(childPath, { withFileTypes: true })) {
        const filePath = join(childPath, variant.name)
        const file = await lstat(filePath)
        if (!VARIANT_FILE.test(variant.name) || !file.isFile() || file.isSymbolicLink()) {
          throw new Error("UNKNOWN_MEDIA_VARIANT_ENTRY")
        }
        outputBytes += file.size
      }
    }
    if (inputBytes > MAX_INPUT_BYTES || outputBytes > MAX_OUTPUT_BYTES
      || inputBytes + outputBytes > MAX_INPUT_BYTES + MAX_OUTPUT_BYTES) {
      throw new Error("MEDIA_JOB_TEMPORARY_LIMIT_EXCEEDED")
    }
    // 📚 El marker tiene su propio máximo: sus bytes cuentan para el root, pero no
    // 📚 deben consumirse contra los 10 MB asignados al archivo original.
    total += inputBytes + markerBytes + outputBytes
  }
  return total
}

// 📚 Los SDKs pueden adjuntar secretos al mensaje/cause, por eso el log usa solo
// 📚 clase de error y UUID interno del trabajo.
function reportSafeRuntimeError(error: unknown, jobId?: string): void {
  const name = error instanceof Error ? error.name : "UnknownError"
  // 📚 Evitamos imprimir message/cause porque SDKs pueden incluir endpoint o claves en ellos.
  console.error("Media runtime operation failed", { name, jobId })
}

// 📚 Guardamos la causa para diagnóstico interno sin incluirla en el texto que ve HTTP.
function safeRuntimeError(message: string, cause: unknown): AppError {
  const error = new AppError(503, message)
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}

// 📚 ENOENT es un archivo ausente esperado durante inspecciones, no una razón para
// 📚 seguir una ruta alternativa o asumir que otro directorio es equivalente.
function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT"
}
