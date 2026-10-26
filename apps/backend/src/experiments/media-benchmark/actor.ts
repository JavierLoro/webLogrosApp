import "dotenv/config"
import { randomUUID } from "node:crypto"
import { isAbsolute, join } from "node:path"
import { createServer, type Server } from "node:http"
import { AsyncLocalStorage } from "node:async_hooks"
import express from "express"
import cookieParser from "cookie-parser"
import jwt from "jsonwebtoken"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import prisma from "../../lib/prisma"
import { DATABASE_URL, JWT_SECRET } from "../../config/env"
import { objectStoreConfigFromEnv } from "../../config/objectStoreEnv"
import { ObjectStore } from "../../lib/objectStore"
import { createMediaRuntime, type MediaRuntime } from "../../lib/mediaRuntime"
import { resolveTeam } from "../../middleware/resolveTeam"
import { createMediaRouter } from "../../routes/media"
import { errorHandler } from "../../middleware/errorHandler"
import type { MediaPublicationStore } from "../../lib/mediaPublication"
import type { executeMediaImage as ExecuteMediaImage } from "../../lib/mediaImageExecutor"
import { resolve } from "node:path"

// 📚 El protocolo estricto deja que el runner controle paths y UUID sin aceptar
// 📚 campos inesperados que podrían cambiar el alcance del experimento.
const startSchema = z.object({
  type: z.literal("start"),
  runId: z.string().uuid(),
  temporaryRoot: z.string().refine(isAbsolute),
  metricsRoot: z.string().refine(isAbsolute),
  expectedDatabase: z.string().min(1).max(63),
  expectedBucket: z.string().min(1),
  origin: z.literal("http://localhost:3000"),
}).strict()
const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hold"), enabled: z.boolean(), requestId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("release"), requestId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("snapshot"), requestId: z.string().min(1) }).strict(),
  z.object({ type: z.literal("stop"), requestId: z.string().min(1) }).strict(),
])
const activeStatuses = ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] as const
const safeJobSelect = {
  id: true, status: true, createdAt: true, queuedAt: true, processingStartedAt: true,
  executorStartedAt: true, publisherStartedAt: true, completedAt: true, failureCode: true, workerPid: true,
  resourceKey: true, cancelRequestedAt: true,
} as const

type JsonRecord = Record<string, unknown>
type GateWaiter = { resolve(): void; signal?: AbortSignal; onAbort?: () => void }
const workerContext = new AsyncLocalStorage<{ jobId: string }>()
let actorStage = "start"

// 📚 Una compuerta colocada justo antes de Sharp permite llenar dos puestos y la
// 📚 cola real sin cambiar límites de producción ni introducir esperas temporizadas.
class ExecutionGate {
  private held = false
  private readonly waiters = new Set<GateWaiter>()

  setHeld(enabled: boolean): void {
    this.held = enabled
    if (!enabled) {
      for (const waiter of [...this.waiters]) {
        this.waiters.delete(waiter)
        if (waiter.signal && waiter.onAbort) waiter.signal.removeEventListener("abort", waiter.onAbort)
        waiter.resolve()
      }
    }
  }

  async wait(signal?: AbortSignal): Promise<void> {
    if (!this.held || signal?.aborted) return
    await new Promise<void>((resolveWait) => {
      const waiter: GateWaiter = { resolve: resolveWait, signal }
      waiter.onAbort = () => {
        this.waiters.delete(waiter)
        resolveWait()
      }
      this.waiters.add(waiter)
      signal?.addEventListener("abort", waiter.onAbort, { once: true })
      if (!this.held || signal?.aborted) waiter.onAbort()
    })
  }
}

// 📚 El wrapper conserva exactamente la interfaz productiva y registra solo las
// 📚 claves enviadas por esta vida del actor para poder retirarlas al cerrar.
function trackedStore(store: ObjectStore, keys: Set<string>): MediaPublicationStore & { destroy(): void } {
  return {
    put: async (key, body, contentType) => { keys.add(key); await store.put(key, body, contentType) },
    head: (key) => store.head(key),
    get: (key) => store.get(key),
    delete: (key) => store.delete(key),
    destroy: () => store.destroy(),
  }
}

// 📚 Envolvemos fork solo en este proceso; el preload recibe rutas absolutas y
// 📚 un ID por worker, mientras opciones y entorno originales siguen intactos.
function installWorkerMetrics(metricsRoot: string): void {
  const childProcess = require("node:child_process") as typeof import("node:child_process")
  const originalFork = childProcess.fork
  const workerSuffix = /mediaImageWorker\.(?:js|ts)$/i
  childProcess.fork = ((modulePath: string, args?: readonly string[], options?: import("node:child_process").ForkOptions) => {
    const opts = options ?? {}
    if (workerSuffix.test(modulePath)) {
      const preload = join(__dirname, `workerMetricsPreload.${resolve(__filename).endsWith(".js") ? "js" : "ts"}`)
      const currentExecArgv = opts.execArgv ?? process.execArgv
      const execArgv = [...currentExecArgv, "--require", preload]
      const attempt = randomUUID()
      const jobId = workerContext.getStore()?.jobId ?? "unknown"
      const child = originalFork(modulePath, args, {
        ...opts,
        execArgv,
        env: {
          ...opts.env,
          MEDIA_BENCHMARK_WORKER_METRICS: "1",
          MEDIA_BENCHMARK_METRICS_DIR: metricsRoot,
          MEDIA_BENCHMARK_ATTEMPT: attempt,
          MEDIA_BENCHMARK_JOB_ID: jobId,
        },
      })
      const report = (event: "spawn" | "started" | "processed" | "close", at: string): void => {
        if (process.send) process.send({ type: "worker", event, at, pid: child.pid, attempt, jobId })
      }
      report("spawn", new Date().toISOString())
      child.on("message", (raw) => {
        if (typeof raw !== "object" || raw === null || !("type" in raw)) return
        const type = (raw as { type?: unknown }).type
        if (type === "started" || type === "processed") report(type, new Date().toISOString())
      })
      child.once("close", () => report("close", new Date().toISOString()))
      return child
    }
    return originalFork(modulePath, args, options)
  }) as typeof originalFork
}

function send(message: JsonRecord, flushed?: () => void): void {
  process.stdout.write(`${JSON.stringify(message)}\n`, flushed)
}

function sanitizeFailure(error: unknown): string {
  const ownCodes = new Set([
    "MEDIA_BENCHMARK_WRITES_DISABLED", "DATABASE_TARGET_MISMATCH", "BUCKET_TARGET_MISMATCH",
    "NON_CANONICAL_ROOT", "ACTIVE_MEDIA_JOBS_PRESENT", "RUNTIME_NOT_ACCEPTING", "HTTP_LISTEN_FAILED",
  ])
  if (error instanceof Error && ownCodes.has(error.message)) return error.message
  return "MEDIA_BENCHMARK_ACTOR_FAILED"
}

async function counts(db: PrismaClient): Promise<JsonRecord> {
  const [users, teams, memberships, achievements, jobs, assets, cleanups, owners, orphanCleanups] = await Promise.all([
    db.user.count(), db.team.count(), db.teamMembership.count(), db.logro.count(), db.mediaJob.count(),
    db.mediaAsset.count(), db.mediaAssetCleanup.count(), db.mediaRuntimeOwner.count(), db.mediaOrphanCleanup.count(),
  ])
  return { users, teams, memberships, achievements, jobs, assets, cleanups, owners, orphanCleanups }
}

async function cleanupFixture(input: {
  db: PrismaClient; runId: string; userId: number; teamId: number; ownerId: string; runtime: MediaRuntime | null;
  server: Server | null; keys: Set<string>; store: ObjectStore; before: JsonRecord;
}): Promise<JsonRecord> {
  const errors: string[] = []
  if (input.server?.listening) {
    await new Promise<void>((resolveClose, reject) => input.server!.close((error) => error ? reject(error) : resolveClose()))
  }
  let objectsRemoved = 0
  if (input.runtime) {
    try { await input.runtime.stop() } catch {
      errors.push("RUNTIME_STOP_FAILED")
      input.store.destroy()
      const after = await counts(input.db).catch(() => ({}))
      return { before: input.before, after, objectsRemoved, errors, fixturePreserved: true, namespace: `media-benchmark-${input.runId}` }
    }
  }
  for (const key of input.keys) {
    try {
      await input.store.delete(key)
      if (await input.store.head(key) !== null) { errors.push("OBJECT_REMAINS"); break }
      objectsRemoved++
    } catch { errors.push("OBJECT_CLEANUP_FAILED"); break }
  }
  input.store.destroy()
  if (errors.length > 0) {
    const after = await counts(input.db).catch(() => ({}))
    return { before: input.before, after, objectsRemoved, errors, fixturePreserved: true, namespace: `media-benchmark-${input.runId}` }
  }
  try {
    await input.db.$transaction(async (tx) => {
      const team = await tx.team.findUnique({ where: { id: input.teamId }, select: { id: true } })
      if (team) {
        await tx.$executeRaw`UPDATE "Logro" SET "imageAssetId" = NULL WHERE "teamId" = ${input.teamId}`
        await tx.userLogro.deleteMany({ where: { logro: { teamId: input.teamId } } })
        await tx.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: input.teamId } } })
        await tx.mediaAsset.deleteMany({ where: { teamId: input.teamId } })
        await tx.mediaJob.deleteMany({ where: { teamId: input.teamId } })
        await tx.logro.deleteMany({ where: { teamId: input.teamId } })
        await tx.teamMembership.deleteMany({ where: { teamId: input.teamId } })
        await tx.team.delete({ where: { id: input.teamId } })
      }
      await tx.user.deleteMany({ where: { id: input.userId } })
      await tx.mediaOrphanCleanup.deleteMany({ where: { runtimeOwnerId: input.ownerId } })
      await tx.mediaRuntimeOwner.deleteMany({ where: { id: input.ownerId } })
    })
  } catch { errors.push("FIXTURE_CLEANUP_FAILED") }
  const after = await counts(input.db).catch(() => ({}))
  return { before: input.before, after, objectsRemoved, errors, namespace: `media-benchmark-${input.runId}` }
}

// 📚 El actor es un proceso aislado: carga el entorno heredado, valida el destino,
// 📚 toma el lock productivo y luego sirve la misma API que el servidor real.
async function runActor(raw: unknown): Promise<void> {
  actorStage = "start_validation"
  if (process.env.MEDIA_BENCHMARK_ALLOW_WRITES !== "1") throw new Error("MEDIA_BENCHMARK_WRITES_DISABLED")
  const input = startSchema.parse(raw)
  actorStage = "destination_validation"
  const dbUrl = new URL(DATABASE_URL)
  const databaseName = decodeURIComponent(dbUrl.pathname.replace(/^\//, ""))
  if (databaseName !== input.expectedDatabase) throw new Error("DATABASE_TARGET_MISMATCH")
  const objectConfig = objectStoreConfigFromEnv()
  if (objectConfig.bucket !== input.expectedBucket) throw new Error("BUCKET_TARGET_MISMATCH")
  const cfg = await import("node:fs/promises")
  const canonicalTemp = await cfg.realpath(input.temporaryRoot)
  const canonicalMetrics = await cfg.realpath(input.metricsRoot)
  if (canonicalTemp !== resolve(input.temporaryRoot) || canonicalMetrics !== resolve(input.metricsRoot)) throw new Error("NON_CANONICAL_ROOT")

  actorStage = "database_preflight"
  const db = prisma
  const before = await counts(db)
  const existingActive = await db.mediaJob.count({ where: { status: { in: [...activeStatuses] } } })
  if (existingActive !== 0) throw new Error("ACTIVE_MEDIA_JOBS_PRESENT")

  const baseStore = new ObjectStore(objectConfig)
  // 📚 Runtime.stop destruye su almacén al cerrar; el cliente separado permite
  // 📚 comprobar y borrar objetos propios después de que el runtime haya parado.
  const cleanupStore = new ObjectStore(objectConfig)
  const keys = new Set<string>()
  const store = trackedStore(baseStore, keys)
  const gate = new ExecutionGate()
  const executor = require("../../lib/mediaImageExecutor") as { executeMediaImage: typeof ExecuteMediaImage }
  const realExecute = executor.executeMediaImage
  executor.executeMediaImage = async (request, options) => {
    await gate.wait(options?.signal)
    return workerContext.run({ jobId: require("node:path").basename(request.directory) as string }, () => realExecute(request, options))
  }
  installWorkerMetrics(canonicalMetrics)

  let runtime: MediaRuntime | null = null
  let server: Server | null = null
  let fixture: { userId: number; teamId: number; slug: string; achievementIds: number[] } | null = null
  let cookie = ""
  let stopping = false
  let stopPromise: Promise<void> | null = null
  try {
    // 📚 El runtime adquiere lock y verifica DB/S3/raíz antes de crear cualquier fixture.
    actorStage = "runtime_preflight"
    runtime = await createMediaRuntime({ temporaryRoot: canonicalTemp, store, allowedOrigins: [input.origin], db })
    if (!runtime.accepting()) throw new Error("RUNTIME_NOT_ACCEPTING")
    const runNamespace = `media-benchmark-${input.runId}`
    actorStage = "fixture_creation"
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { email: `${runNamespace}@example.invalid`, password: "benchmark-no-login" } })
      const team = await tx.team.create({ data: { nombre: runNamespace, slug: runNamespace } })
      await tx.teamMembership.create({ data: { userId: user.id, teamId: team.id, role: "TEAM_ADMIN" } })
      const achievements = await Promise.all(Array.from({ length: 13 }, (_, index) => tx.logro.create({
        data: { nombre: `${runNamespace}-${String(index + 1).padStart(2, "0")}`, puntos: 1, teamId: team.id },
      })))
      return { userId: user.id, teamId: team.id, slug: team.slug, achievementIds: achievements.map(({ id }) => id) }
    })
    fixture = created
    cookie = `auth_token=${jwt.sign({ userId: created.userId }, JWT_SECRET, { expiresIn: "2h" })}`

    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.get("/health", async (_req, res) => {
      try {
        await db.$queryRaw`SELECT 1`
        if (!runtime?.accepting()) { res.status(503).json({ status: "error" }); return }
        res.status(200).json({ status: "ok" })
      } catch { res.status(503).json({ status: "error" }) }
    })
    app.use(`/equipos/:slug`, resolveTeam, createMediaRouter({ db, getRuntime: () => runtime }))
    app.use(errorHandler)
    server = createServer(app)
    actorStage = "http_start"
    await new Promise<void>((resolveListen, reject) => {
      server!.once("error", reject)
      server!.listen(0, "127.0.0.1", () => { server!.removeListener("error", reject); resolveListen() })
    })
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("HTTP_LISTEN_FAILED")
    const samples = setInterval(() => {
      const memory = process.memoryUsage()
      const cpu = process.cpuUsage()
      send({ type: "sample", atISO: new Date().toISOString(), pid: process.pid, memory,
        cpu, resourceUsageMaxRssBytes: process.resourceUsage().maxRSS * 1024 })
    }, 100)
    samples.unref()
    send({ type: "ready", baseUrl: `http://127.0.0.1:${address.port}`, teamSlug: created.slug,
      achievementIds: created.achievementIds, cookie, ownerId: runtime.ownerId })
    actorStage = "ready"

    const stop = async (requestId: string): Promise<void> => {
      if (stopPromise) return stopPromise
      stopping = true
      gate.setHeld(false)
      stopPromise = (async () => {
        const cleanup = fixture
          ? await cleanupFixture({ db, runId: input.runId, userId: fixture.userId, teamId: fixture.teamId,
            ownerId: runtime!.ownerId, runtime, server, keys, store: cleanupStore, before })
          : { before, after: await counts(db), objectsRemoved: 0, errors: [] }
        clearInterval(samples)
        await db.$disconnect().catch(() => undefined)
        const cleanupErrors = (cleanup as { errors?: unknown }).errors
        process.exitCode = Array.isArray(cleanupErrors) && cleanupErrors.length > 0 ? 1 : 0
        const activeResourceCounts = process.getActiveResourcesInfo().reduce<Record<string, number>>((counts, resourceName) => {
          counts[resourceName] = (counts[resourceName] ?? 0) + 1
          return counts
        }, {})
        // 📚 Primero confirmamos que stopped llegó por stdout; después destruimos
        // 📚 stdin y cerramos IPC, dejando que Node salga cuando todos los handles
        // 📚 del server, Prisma y los workers estén realmente drenados.
        await new Promise<void>((resolveFlush) => send({ type: "stopped", requestId, cleanup, activeResourceCounts }, () => resolveFlush()))
        process.stdin.destroy()
        if (process.connected) process.disconnect?.()
      })()
      return stopPromise
    }

    let buffered = ""
    const onData = (chunk: Buffer): void => {
      buffered += chunk.toString("utf8")
      while (true) {
        const newline = buffered.indexOf("\n")
        if (newline < 0) break
        const line = buffered.slice(0, newline)
        buffered = buffered.slice(newline + 1)
        void handleCommand(line)
      }
    }
    const handleCommand = async (line: string): Promise<void> => {
      let command: z.infer<typeof commandSchema>
      try { command = commandSchema.parse(JSON.parse(line)) } catch { send({ type: "error", code: "INVALID_COMMAND", message: "Invalid private IPC command" }); return }
      if (command.type === "hold") { gate.setHeld(command.enabled); send({ type: "ack", requestId: command.requestId }); return }
      if (command.type === "release") { gate.setHeld(false); runtime?.wake(); send({ type: "ack", requestId: command.requestId }); return }
      if (command.type === "snapshot") {
        const jobs = await db.mediaJob.findMany({ where: { teamId: created.teamId }, select: safeJobSelect, orderBy: { createdAt: "asc" } })
        const assets = await db.mediaAsset.findMany({ where: { teamId: created.teamId }, select: { variants: true } })
        const variantSizes = assets.flatMap(({ variants }) => Array.isArray(variants) ? variants.flatMap((variant) => {
          if (typeof variant !== "object" || variant === null) return []
          const item = variant as { width?: unknown; height?: unknown; size?: unknown }
          return [{ width: item.width, height: item.height, byteLength: item.size }]
        }) : [])
        const [active, waiting, pendingCleanupCount, readyReferences] = await Promise.all([
          db.mediaJob.count({ where: { status: { in: [...activeStatuses] } } }),
          db.mediaJob.count({ where: { teamId: created.teamId, status: "QUEUED" } }),
          db.mediaAssetCleanup.count({ where: { status: "PENDING", asset: { teamId: created.teamId } } }),
          db.$queryRaw<Array<{ id: number; imageAssetId: string | null; state: string }>>`
            SELECT logro."id", logro."imageAssetId", asset."state"
            FROM "Logro" AS logro
            JOIN "MediaAsset" AS asset ON asset."id" = logro."imageAssetId"
            WHERE logro."teamId" = ${created.teamId} AND asset."state" = 'READY'
            ORDER BY logro."id" ASC
          `,
        ])
        send({ type: "snapshot", requestId: command.requestId, jobs,
          counts: { globalActive: active, ownWaiting: waiting, pendingCleanupCount },
          readyReferences, variantSizes })
        return
      }
      if (command.type === "stop") await stop(command.requestId)
    }
    process.stdin.on("data", onData)
    process.stdin.on("end", () => { gate.setHeld(false); if (!stopping) void stop(`disconnect-${randomUUID()}`) })
    process.on("SIGINT", () => { gate.setHeld(false); if (!stopping) void stop(`signal-${randomUUID()}`) })
  } catch (error) {
    gate.setHeld(false)
    if (server?.listening) await new Promise<void>((done) => server!.close(() => done()))
    let drained = true
    if (runtime) {
      try { await runtime.stop() } catch { drained = false }
    }
    let objectsSafeToForget = drained
    if (drained) {
      for (const key of keys) {
        try {
          await cleanupStore.delete(key)
          if (await cleanupStore.head(key) !== null) { objectsSafeToForget = false; break }
        } catch { objectsSafeToForget = false; break }
      }
    }
    if (fixture && objectsSafeToForget) {
      try {
        await db.$transaction(async (tx) => {
          await tx.mediaJob.deleteMany({ where: { teamId: fixture!.teamId } })
          await tx.logro.deleteMany({ where: { teamId: fixture!.teamId } })
          await tx.teamMembership.deleteMany({ where: { teamId: fixture!.teamId } })
          await tx.team.deleteMany({ where: { id: fixture!.teamId } })
          await tx.user.deleteMany({ where: { id: fixture!.userId } })
          if (runtime) {
            await tx.mediaOrphanCleanup.deleteMany({ where: { runtimeOwnerId: runtime.ownerId } })
            await tx.mediaRuntimeOwner.deleteMany({ where: { id: runtime.ownerId } })
          }
        })
      } catch { /* safe error below has no original cause */ }
    }
    if (!objectsSafeToForget) actorStage = "startup_cleanup_blocked"
    baseStore.destroy()
    cleanupStore.destroy()
    await db.$disconnect().catch(() => undefined)
    throw new Error(sanitizeFailure(error))
  }
}

// 📚 La primera línea es el start firmado por el runner; el resto son comandos
// 📚 de una sola línea. Los errores deliberadamente no serializan causas ni secretos.
async function main(): Promise<void> {
  let firstLine = ""
  const first = await new Promise<string>((resolveFirst) => {
    const onData = (chunk: Buffer): void => {
      firstLine += chunk.toString("utf8")
      const newline = firstLine.indexOf("\n")
      if (newline >= 0) {
        process.stdin.removeListener("data", onData)
        resolveFirst(firstLine.slice(0, newline))
      }
    }
    process.stdin.on("data", onData)
    process.stdin.resume()
  })
  try { await runActor(JSON.parse(first)) }
  catch (error) {
    const code = sanitizeFailure(error)
    send({ type: "error", code, stage: actorStage, message: "The isolated media benchmark actor could not start" })
    await prisma.$disconnect().catch(() => undefined)
    process.stdin.destroy()
    if (process.connected) process.disconnect?.()
    process.exitCode = 1
  }
}

if (require.main === module) void main()
