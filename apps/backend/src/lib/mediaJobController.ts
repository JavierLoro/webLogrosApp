import { resolve, join } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "../errors/AppError"
import { parseImageTarget } from "./mediaTargets"
import { executeClaimedMediaJob, MediaJobPreparationError } from "./mediaJobExecution"
import { imageKindSchema } from "./mediaImageProtocol"
import { claimNextQueuedMediaJob, type ClaimedMediaJob } from "./mediaJobClaims"
import { publishClaimedAchievementImage, type MediaPublicationStore } from "./mediaPublication"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"
import prisma from "./prisma"

const MAX_CONCURRENT_JOBS = 2

type ControllerOptions = {
  temporaryRoot: string
  store: MediaPublicationStore
  db?: PrismaClient
  onError?: (error: unknown, jobId?: string) => void
  runtimeOwnerId?: string
}

type PersistedReceipt = {
  imageKind: string | null
  inputDirectory: string | null
  receiptToken: string | null
  receiptStartedAt: Date | null
  cancelRequestedAt: Date | null
}

// 📚 El controller conecta la toma DB, Sharp y publicación sin arrancar procesos
// 📚 por importación; el composition root futuro decide cuándo llamar tick().
export class MediaJobController {
  private readonly db: PrismaClient
  private readonly active = new Map<string, { task: Promise<void>; abort: AbortController }>()
  private tickInFlight: Promise<number> | null = null
  private stopping = false

  constructor(private readonly options: ControllerOptions) {
    this.db = options.db ?? prisma
  }

  // 📚 Compartimos una promesa por instancia para que dos ticks simultáneos no
  // 📚 consuman trabajo de más; la toma global aún la arbitra PostgreSQL.
  tick(): Promise<number> {
    if (this.stopping) return Promise.resolve(0)
    if (this.tickInFlight) return this.tickInFlight
    const run = this.reconcileCancellations().then(() => this.fillCapacity())
    this.tickInFlight = run
    void run.finally(() => {
      if (this.tickInFlight === run) this.tickInFlight = null
    }).catch((error: unknown) => this.report(error))
    return run
  }

  // 📚 Las solicitudes son durables en PostgreSQL; el poll las convierte en abort
  // 📚 cooperativo sin liberar el slot mientras Sharp o S3 sigan físicamente activos.
  async reconcileCancellations(): Promise<void> {
    if (!this.options.runtimeOwnerId) return
    const jobs = await this.db.mediaJob.findMany({
      where: {
        runtimeOwnerId: this.options.runtimeOwnerId,
        cancelRequestedAt: { not: null },
        status: { in: ["RECEIVING", "PROCESSING", "PUBLISHING"] },
      },
      select: { id: true },
    })
    for (const { id } of jobs) this.active.get(id)?.abort.abort()
  }

  // 📚 idle permite que un scheduler o una prueba espere el trabajo actual sin
  // 📚 convertir tick en una espera que impida llenar el segundo puesto.
  async idle(): Promise<void> {
    while (this.active.size > 0 || this.tickInFlight) {
      const currentTick = this.tickInFlight
      const tasks = [...this.active.values()].map(({ task }) => task)
      await Promise.allSettled([...tasks, ...(currentTick ? [currentTick] : [])])
    }
  }

  // 📚 La recuperación consulta esta lista mientras el poll impide nuevas tomas;
  // 📚 un trabajo en este Map todavía puede escribir o publicar y debe conservarse.
  getActiveJobIds(): readonly string[] {
    return [...this.active.keys()]
  }

  // 📚 El cierre envía abort cooperativo y espera `close` del hijo Sharp y la
  // 📚 publicación en curso antes de que el proceso dueño cierre sus recursos.
  async stop(): Promise<void> {
    this.stopping = true
    for (const { abort } of this.active.values()) abort.abort()
    await this.idle()
  }

  private async fillCapacity(): Promise<number> {
    let claimedCount = 0
    while (!this.stopping && claimedCount < MAX_CONCURRENT_JOBS && this.active.size < MAX_CONCURRENT_JOBS) {
      const claim = await claimNextQueuedMediaJob(this.db, this.options.runtimeOwnerId)
      if (!claim) break
      claimedCount += 1
      this.launch(claim)
    }
    return claimedCount
  }

  private launch(claim: ClaimedMediaJob): void {
    const abort = new AbortController()
    if (this.stopping) abort.abort()
    const task = this.process(claim, abort.signal)
    this.active.set(claim.id, { task, abort })
    void task.finally(() => {
      this.active.delete(claim.id)
    }).catch((error: unknown) => this.report(error, claim.id))
  }

  private async process(claim: ClaimedMediaJob, signal: AbortSignal): Promise<void> {
    let receipt: PersistedReceipt | null
    try {
      receipt = await this.loadReceipt(claim)
    } catch (error) {
      this.report(error, claim.id)
      return
    }

    if (!receipt || !this.receiptMatches(claim, receipt)) {
      const canceled = signal.aborted || receipt?.cancelRequestedAt !== null && receipt?.cancelRequestedAt !== undefined
      const terminal = await this.failBeforeExecution(claim, canceled ? "CANCELED" : "INVALID_RECEIPT", canceled ? "CANCELED" : "FAILED")
      if (terminal) await this.cleanupConfirmedTerminal(claim.id)
      return
    }

    if (signal.aborted || receipt.cancelRequestedAt !== null) {
      const terminal = await this.failBeforeExecution(claim, "CANCELED", "CANCELED")
      if (terminal) await this.cleanupConfirmedTerminal(claim.id)
      return
    }

    const target = parseImageTarget(claim.resourceKey)
    if (!target || claim.teamId === null || target.teamId !== claim.teamId || receipt.imageKind !== "achievement") {
      const terminal = await this.failBeforeExecution(claim, "UNSUPPORTED_TARGET")
      if (terminal) await this.cleanupConfirmedTerminal(claim.id)
      return
    }

    try {
      await executeClaimedMediaJob(claim, {
        temporaryRoot: this.options.temporaryRoot,
        kind: "achievement",
      }, { signal }, this.db)
    } catch (error) {
      if (error instanceof MediaJobPreparationError) {
        const terminal = await this.failBeforeExecution(claim, "WORKSPACE_INVALID")
        if (terminal) await this.cleanupConfirmedTerminal(claim.id)
        return
      }
      if (await this.confirmTerminal(claim.id)) await this.cleanupConfirmedTerminal(claim.id)
      else if (!(error instanceof AppError && error.statusCode === 409)) this.report(error, claim.id)
      return
    }

    try {
      await publishClaimedAchievementImage(claim, {
        temporaryRoot: this.options.temporaryRoot,
        signal,
      }, this.options.store, this.db)
    } catch (error) {
      // 📚 Un error de red/DB no prueba que la publicación haya terminado; solo
      // 📚 limpiamos si PostgreSQL confirma un estado terminal bajo este UUID.
      if (await this.confirmTerminal(claim.id)) await this.cleanupConfirmedTerminal(claim.id)
      else if (!(error instanceof AppError && error.statusCode === 409)) this.report(error, claim.id)
      return
    }

    if (await this.confirmTerminal(claim.id)) await this.cleanupConfirmedTerminal(claim.id)
  }

  private async loadReceipt(claim: ClaimedMediaJob): Promise<PersistedReceipt | null> {
    return this.db.mediaJob.findFirst({
      where: {
        id: claim.id,
        ownerId: claim.ownerId,
        teamId: claim.teamId,
        resourceKey: claim.resourceKey,
        status: "PROCESSING",
        processingSlot: claim.slot,
        executionToken: claim.executionToken,
        processingStartedAt: claim.startedAt,
        executorStartedAt: null,
      },
      select: { imageKind: true, inputDirectory: true, receiptToken: true, receiptStartedAt: true, cancelRequestedAt: true },
    })
  }

  private receiptMatches(claim: ClaimedMediaJob, receipt: PersistedReceipt): boolean {
    const expectedDirectory = join(resolve(this.options.temporaryRoot), claim.id)
    const legacyReceipt = receipt.receiptToken === null && receipt.receiptStartedAt === null
    const completeReceipt = receipt.receiptToken !== null && receipt.receiptStartedAt instanceof Date
    return (legacyReceipt || completeReceipt)
      && receipt.imageKind !== null
      && imageKindSchema.safeParse(receipt.imageKind).success
      && receipt.inputDirectory === expectedDirectory
  }

  // 📚 Solo el error marcado de preparación llega aquí: confirma que Sharp no
  // 📚 arrancó, y el CAS libera únicamente la misma toma aún sin executorStartedAt.
  private async failBeforeExecution(claim: ClaimedMediaJob, failureCode: string, status: "FAILED" | "CANCELED" = "FAILED"): Promise<boolean> {
    try {
      const changed = await this.db.mediaJob.updateMany({
        where: {
          id: claim.id,
          ownerId: claim.ownerId,
          teamId: claim.teamId,
          resourceKey: claim.resourceKey,
          status: "PROCESSING",
          processingSlot: claim.slot,
          executionToken: claim.executionToken,
          processingStartedAt: claim.startedAt,
          executorStartedAt: null,
        },
        data: {
          status,
          activeResourceKey: null,
          processingSlot: null,
          completedAt: new Date(),
          failureCode,
          resultDirectory: null,
          resultManifest: Prisma.DbNull,
          cleanupPendingDirectory: join(resolve(this.options.temporaryRoot), claim.id),
        },
      })
      return changed.count === 1
    } catch (error) {
      this.report(error, claim.id)
      return false
    }
  }

  private async confirmTerminal(jobId: string): Promise<boolean> {
    try {
      const job = await this.db.mediaJob.findUnique({ where: { id: jobId }, select: { status: true } })
      return job?.status === "SUCCEEDED" || job?.status === "FAILED" || job?.status === "CANCELED"
    } catch (error) {
      this.report(error, jobId)
      return false
    }
  }

  private async cleanupConfirmedTerminal(jobId: string): Promise<void> {
    try {
      await cleanupTerminalMediaJobTemporaryFiles(jobId, this.options.temporaryRoot, this.db)
    } catch (error) {
      // 📚 La limpieza incompleta queda registrada en cleanupPendingDirectory para una pasada futura.
      this.report(error, jobId)
    }
  }

  private report(error: unknown, jobId?: string): void {
    try { this.options.onError?.(error, jobId) } catch { /* La observabilidad nunca debe tumbar el worker. */ }
  }
}

// 📚 Una fábrica hace explícitas las dependencias de infraestructura y deja el
// 📚 constructor de la clase como punto sencillo para inyección en pruebas.
export function createMediaJobController(options: ControllerOptions): MediaJobController {
  if (!options.temporaryRoot.trim()) throw new AppError(500, "Falta configurar el directorio temporal")
  return new MediaJobController(options)
}
