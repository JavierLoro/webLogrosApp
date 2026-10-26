import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { PassThrough, Readable } from "node:stream"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import cookieParser from "cookie-parser"
import express from "express"
import jwt from "jsonwebtoken"
import sharp from "sharp"
import { DATABASE_URL, JWT_SECRET } from "../config/env"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import { errorHandler } from "../middleware/errorHandler"
import { resolveTeam } from "../middleware/resolveTeam"
import { createMediaRouter } from "../routes/media"
import { receiveAchievementImage } from "./mediaAchievementTarget"
import { achievementImageResourceKey } from "./mediaAchievementTarget"
import { admitReceivingMediaJob, markMediaJobQueuedAfterClosedReceipt } from "./mediaJobAdmission"
import { requestMediaJobCancellation } from "./mediaJobCancellation"
import { claimNextQueuedMediaJob } from "./mediaJobClaims"
import { executeClaimedMediaJob } from "./mediaJobExecution"
import { startMediaJobReceipt } from "./mediaJobReceipts"
import { receiveMediaUpload } from "./mediaUploadReceiver"
import { createMediaRuntime, type MediaRuntime, type MediaRuntimePort } from "./mediaRuntime"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"
import { ObjectStore } from "./objectStore"
import prisma from "./prisma"

// 📚 Gates alrededor de I/O real fuerzan el orden de las carreras sin depender
// 📚 de que un archivo concreto tarde lo suficiente en un ordenador concreto.
function gate() {
  let release!: () => void
  let notify!: () => void
  const reached = new Promise<void>((resolveReached) => { notify = resolveReached })
  const waiting = new Promise<void>((resolveWaiting) => { release = resolveWaiting })
  return { reached, release, async hold() { notify(); await waiting } }
}

test("cancelación durable por API conserva reservas hasta cierre y arbitra el commit final", {
  skip: process.env.MEDIA_JOB_CANCELLATION_TEST !== "1", timeout: 180_000,
}, async (t) => {
  const url = new URL(DATABASE_URL)
  assert.equal(url.hostname, "127.0.0.1")
  assert.equal(url.port, "55437")
  assert.equal(url.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv()
  assert.equal(new URL(config.endpoint).hostname, "127.0.0.1")
  assert.equal(new URL(config.endpoint).port, "8333")
  assert.equal(config.bucket, "lockerboard-media-dev")
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(),
    memberships: await db.teamMembership.count(), achievements: await db.logro.count(), jobs: await db.mediaJob.count(),
    assets: await db.mediaAsset.count(), cleanups: await db.mediaAssetCleanup.count(), owners: await db.mediaRuntimeOwner.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0)
  const run = randomUUID()
  const fixture = await db.$transaction(async (tx) => {
    const admin = await tx.user.create({ data: { email: `cancel-${run}@example.invalid`, password: "no-login" } })
    const second = await tx.user.create({ data: { email: `cancel-other-${run}@example.invalid`, password: "no-login" } })
    const player = await tx.user.create({ data: { email: `cancel-player-${run}@example.invalid`, password: "no-login" } })
    const team = await tx.team.create({ data: { slug: `cancel-${run}`, nombre: "Cancel fixture" } })
    const other = await tx.team.create({ data: { slug: `cancel-other-${run}`, nombre: "Other cancel fixture" } })
    await tx.teamMembership.createMany({ data: [
      { userId: admin.id, teamId: team.id, role: "TEAM_ADMIN" },
      { userId: second.id, teamId: team.id, role: "TEAM_ADMIN" },
      { userId: player.id, teamId: team.id, role: "PLAYER" },
      { userId: admin.id, teamId: other.id, role: "TEAM_ADMIN" },
    ] })
    const logro = await tx.logro.create({ data: { teamId: team.id, nombre: "Cancelable image", puntos: 1 } })
    return { admin, second, player, team, other, logro }
  })
  const tempBase = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(tempBase, "media-cancellation-test-")))
  const store = new ObjectStore(config)
  const verifier = new ObjectStore(config)
  const keys = new Set<string>()
  const gates = new Set<ReturnType<typeof gate>>()
  const newGate = () => { const value = gate(); gates.add(value); return value }
  let spawnGate: ReturnType<typeof gate> | null = null
  let putGate: ReturnType<typeof gate> | null = null
  let commitGate: ReturnType<typeof gate> | null = null
  let suppressWake = false
  let cancellationAckFault: "before" | "after" | null = null
  let runtime: MediaRuntime | undefined
  let server: Server | undefined
  let base = ""
  const database = new Proxy(db, { get(target, field) {
    if (field === "mediaJob") return new Proxy(target.mediaJob, { get(delegate, method) {
      if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
        const value = await delegate.updateMany(args)
        if (args.data.workerPid && spawnGate) { const current = spawnGate; spawnGate = null; await current.hold() }
        return value
      }
      const value = Reflect.get(delegate, method, delegate)
      return typeof value === "function" ? value.bind(delegate) : value
    } })
    if (field === "$transaction") return async (callback: unknown, ...rest: unknown[]) => {
      if (typeof callback !== "function") return Reflect.apply(target.$transaction, target, [callback, ...rest])
      let wroteCancellation = false
      const result = await Reflect.apply(target.$transaction, target, [async (tx: Prisma.TransactionClient) => {
        const proxy = new Proxy(tx, { get(transaction, property) {
          if (property === "$queryRaw") return async (...args: unknown[]) => {
            const result = await Reflect.apply(transaction.$queryRaw, transaction, args)
            if (Array.isArray(args[0]) && args[0].join("").includes('"cancelRequestedAt" = COALESCE')) wroteCancellation = true
            return result
          }
          if (property === "mediaJob") return new Proxy(transaction.mediaJob, { get(delegate, method) {
            if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
              const value = await delegate.updateMany(args)
              if (args.data.status === "SUCCEEDED" && commitGate) { const current = commitGate; commitGate = null; await current.hold() }
              return value
            }
            const value = Reflect.get(delegate, method, delegate)
            return typeof value === "function" ? value.bind(delegate) : value
          } })
          const value = Reflect.get(transaction, property, transaction)
          return typeof value === "function" ? value.bind(transaction) : value
        } })
        const result = await callback(proxy)
        if (wroteCancellation && cancellationAckFault === "before") {
          cancellationAckFault = null
          throw new Error("injected-cancellation-rollback")
        }
        return result
      }, ...rest])
      if (wroteCancellation && cancellationAckFault === "after") {
        cancellationAckFault = null
        throw new Error("injected-cancellation-lost-ack")
      }
      return result
    }
    const value = Reflect.get(target, field, target)
    return typeof value === "function" ? value.bind(target) : value
  } }) as PrismaClient
  const waitFor = async <T>(read: () => Promise<T | null | false>): Promise<T> => {
    for (let attempt = 0; attempt < 400; attempt++) {
      const value = await read()
      if (value) return value
      await delay(20)
    }
    throw new Error("El trabajo no alcanzó el estado de cancelación esperado en 8s")
  }
  const cookie = (id = fixture.admin.id) => `auth_token=${jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "5m" })}`
  const cancel = (id: string, options: { cookie?: string; origin?: string; team?: string } = {}) => fetch(
    `${base}/equipos/${options.team ?? fixture.team.slug}/media/trabajos/${id}/cancelar`, {
      method: "POST", headers: { Cookie: options.cookie ?? cookie(), Origin: options.origin ?? "http://localhost:3000" },
    })
  const png = await sharp({ create: { width: 1400, height: 900, channels: 4, background: "#66889980" } }).png().toBuffer()
  const boundary = "cancel-receipt-body"
  const prefix = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="image.png"\r\nContent-Type: image/png\r\n\r\n`)
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`)
  const headers = { "content-type": `multipart/form-data; boundary=${boundary}` }
  const target = { ownerId: fixture.admin.id, teamId: fixture.team.id, achievementId: fixture.logro.id }
  const enqueue = async () => {
    const lease = await runtime!.acquireReceipt()
    try { return (await lease.runOwned(() => receiveAchievementImage(Readable.from([prefix, png, suffix]), headers,
      target, { temporaryRoot: root, signal: lease.signal }, database))).job }
    finally { lease.release() }
  }
  const row = (id: string) => db.mediaJob.findUniqueOrThrow({ where: { id } })
  const terminal = (id: string, status: "CANCELED" | "SUCCEEDED") => waitFor(async () => {
    const value = await row(id)
    return value.status === status && value.cleanupPendingDirectory === null ? value : false
  })
  const imageId = async () => (await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })).imageAssetId
  try {
    runtime = await createMediaRuntime({ temporaryRoot: root, db: database, pollIntervalMs: 60_000,
      allowedOrigins: ["http://localhost:3000"], store: {
        async put(key, bytes, type) {
          keys.add(key)
          await store.put(key, bytes, type)
          if (key.startsWith("media/") && putGate) { const current = putGate; putGate = null; await current.hold() }
        }, head: store.head.bind(store), get: store.get.bind(store), delete: store.delete.bind(store), destroy: store.destroy.bind(store),
      } })
    // 📚 Desactivar solo wake en una carrera fuerza que el guard final lea el flag
    // 📚 DB aunque todavía no haya ocurrido el siguiente poll del AbortController.
    const port: MediaRuntimePort = {
      ownerId: runtime.ownerId, temporaryRoot: root, store: runtime.store, allowedOrigins: runtime.allowedOrigins,
      accepting: runtime.accepting.bind(runtime), acquireReceipt: runtime.acquireReceipt.bind(runtime),
      wake() { if (!suppressWake) runtime!.wake() },
    }
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use("/equipos/:slug", resolveTeam, createMediaRouter({ db: database, getRuntime: () => port }))
    app.use(errorHandler)
    server = createServer(app)
    await new Promise<void>((resolveListening) => server!.listen(0, "127.0.0.1", resolveListening))
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    base = `http://127.0.0.1:${address.port}`
    await delay(100)

    await t.test("sin sesión, Origin ajeno, rol, propietario, equipo e ID inválidos no escriben", async () => {
      const queued = await enqueue()
      for (const [id, options, status] of [
        [queued.id, { cookie: "" }, 401], [queued.id, { origin: "https://foreign.invalid" }, 403],
        [queued.id, { cookie: cookie(fixture.player.id) }, 403], [queued.id, { cookie: cookie(fixture.second.id) }, 404],
        [queued.id, { team: fixture.other.slug }, 404], ["invalid", {}, 400], [randomUUID(), {}, 404],
      ] as Array<[string, Parameters<typeof cancel>[1], number]>) {
        const response = await cancel(id, options)
        assert.equal(response.status, status)
        assert.equal(response.headers.get("cache-control"), "no-store")
        await response.arrayBuffer()
      }
      assert.equal((await row(queued.id)).cancelRequestedAt, null)
      assert.equal((await row(queued.id)).status, "QUEUED")
      assert.equal((await cancel(queued.id)).status, 200)
    })
    await t.test("cancelar QUEUED es idempotente, retira su temporal y no arranca Sharp", async () => {
      const queued = await enqueue()
      const responses = await Promise.all(Array.from({ length: 5 }, () => cancel(queued.id)))
      for (const response of responses) {
        assert.equal(response.status, 200)
        const body = await response.json() as { cancellation: string; job: Record<string, unknown> }
        assert.equal(body.cancellation, "canceled")
        assert.equal(body.job.status, "CANCELED")
        assert.deepEqual(Object.keys(body.job).sort(), ["id", "status", "createdAt", "updatedAt", "completedAt", "failureCode", "cancelRequestedAt"].sort())
      }
      const canceled = await row(queued.id)
      assert.equal(canceled.processingSlot, null)
      assert.equal(canceled.activeResourceKey, null)
      assert.equal(canceled.workerPid, null)
      assert.ok(canceled.cancelRequestedAt)
      await cleanupTerminalMediaJobTemporaryFiles(queued.id, root, db)
      await assert.rejects(lstat(join(root, queued.id)), { code: "ENOENT" })
      const timestamp = canceled.cancelRequestedAt.getTime()
      await cancel(queued.id)
      assert.equal((await row(queued.id)).cancelRequestedAt?.getTime(), timestamp)
    })
    for (const mode of ["before", "after"] as const) {
      await t.test(`acuse de cancelación perdido ${mode} del commit da 503 y admite reintento seguro`, async () => {
        const queued = await enqueue()
        cancellationAckFault = mode
        const first = await cancel(queued.id)
        assert.equal(first.status, 503)
        assert.equal((await first.json() as { error: string }).error, "No se pudo confirmar la cancelación de la imagen")
        assert.equal((await row(queued.id)).status, mode === "before" ? "QUEUED" : "CANCELED")
        assert.equal((await cancel(queued.id)).status, 200)
        assert.equal((await row(queued.id)).status, "CANCELED")
        assert.equal((await row(queued.id)).workerPid, null)
      })
    }
    await t.test("imagen base se publica y cancelación tardía conserva su referencia", async () => {
      const job = await enqueue()
      runtime!.wake()
      await terminal(job.id, "SUCCEEDED")
      assert.ok(await imageId())
      const old = await imageId()
      const response = await cancel(job.id)
      assert.equal(response.status, 409)
      assert.equal((await response.json() as { cancellation: string }).cancellation, "too_late")
      assert.equal((await row(job.id)).cancelRequestedAt, null)
      assert.equal(await imageId(), old)
    })
    await t.test("cancelación durable entre claim y ejecución impide arrancar Sharp sin signal", async () => {
      const old = await imageId()
      const queued = await enqueue()
      const claim = await claimNextQueuedMediaJob(db, runtime!.ownerId)
      assert.equal(claim?.id, queued.id)
      assert.equal((await requestMediaJobCancellation({ id: queued.id, ownerId: fixture.admin.id, teamId: fixture.team.id }, db)).cancellation, "requested")
      await assert.rejects(executeClaimedMediaJob(claim!, { temporaryRoot: root, kind: "achievement" }, {}, db))
      const canceled = await row(queued.id)
      assert.equal(canceled.status, "CANCELED")
      assert.equal(canceled.workerPid, null)
      assert.equal(canceled.processingSlot, null)
      assert.equal(await imageId(), old)
      await cleanupTerminalMediaJobTemporaryFiles(queued.id, root, db)
    })
    await t.test("acuse de recepción cerrado respeta cancelación durable antes de QUEUED", async () => {
      const lease = await runtime!.acquireReceipt()
      try {
        await lease.runOwned(async () => {
          const job = await admitReceivingMediaJob({ ownerId: fixture.admin.id, teamId: fixture.team.id,
            resourceKey: achievementImageResourceKey(fixture.team.id, fixture.logro.id) }, db)
          const claim = await startMediaJobReceipt({ id: job.id, ownerId: fixture.admin.id, teamId: fixture.team.id,
            resourceKey: achievementImageResourceKey(fixture.team.id, fixture.logro.id) }, {
            inputDirectory: join(root, job.id), imageKind: "achievement",
          }, db)
          await receiveMediaUpload(Readable.from([prefix, png, suffix]), headers, { temporaryRoot: root, jobId: job.id,
            ownership: { runtimeOwnerId: runtime!.ownerId, receiptToken: claim.receiptToken } })
          assert.equal((await requestMediaJobCancellation({ id: job.id, ownerId: fixture.admin.id, teamId: fixture.team.id }, db)).cancellation, "requested")
          assert.equal((await row(job.id)).status, "RECEIVING")
          const result = await markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true }, db)
          assert.equal(result.status, "CANCELED")
          assert.equal((await markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true }, db)).status, "CANCELED")
          assert.equal((await row(job.id)).queuedAt, null)
          assert.equal((await row(job.id)).activeResourceKey, null)
          await cleanupTerminalMediaJobTemporaryFiles(job.id, root, db)
        })
      } finally { lease.release() }
    })
    await t.test("cancelación durante registro del worker no libera PROCESSING antes de cerrar", async (caseTest) => {
      const old = await imageId()
      const held = newGate()
      caseTest.after(() => held.release())
      spawnGate = held
      const job = await enqueue()
      runtime!.wake()
      await held.reached
      const response = await cancel(job.id)
      assert.equal(response.status, 202)
      assert.equal((await row(job.id)).status, "PROCESSING")
      assert.ok((await row(job.id)).processingSlot)
      held.release()
      const canceled = await terminal(job.id, "CANCELED")
      assert.equal(canceled.processingSlot, null)
      assert.equal(canceled.activeResourceKey, null)
      assert.equal(await imageId(), old)
    })
    await t.test("cancelar PUBLISHING antes del commit bloquea asociación aun sin signal local", async (caseTest) => {
      const old = await imageId()
      const held = newGate()
      caseTest.after(() => { suppressWake = false; held.release() })
      putGate = held
      const job = await enqueue()
      runtime!.wake()
      await held.reached
      suppressWake = true
      const response = await cancel(job.id)
      assert.equal(response.status, 202)
      const pending = await row(job.id)
      assert.equal(pending.status, "PUBLISHING")
      assert.ok(pending.processingSlot)
      held.release()
      await terminal(job.id, "CANCELED")
      assert.equal(await imageId(), old)
      const cleanup = await db.mediaAssetCleanup.findFirstOrThrow({ where: { asset: { jobId: job.id } } })
      assert.equal(cleanup.status, "COMPLETE")
      for (const key of cleanup.keys) assert.equal(await verifier.head(key), null)
      suppressWake = false
    })
    await t.test("commit definitivo que ganó el lock responde too_late a cancelar", async (caseTest) => {
      const old = await imageId()
      const held = newGate()
      caseTest.after(() => held.release())
      commitGate = held
      const job = await enqueue()
      runtime!.wake()
      await held.reached
      let settled = false
      const response = cancel(job.id).finally(() => { settled = true })
      await delay(80)
      assert.equal(settled, false, "cancelar espera al commit que posee el lock")
      held.release()
      assert.equal((await response).status, 409)
      await terminal(job.id, "SUCCEEDED")
      assert.notEqual(await imageId(), old)
      assert.equal((await row(job.id)).cancelRequestedAt, null)
    })
    await t.test("cancelar RECEIVING aborta su lease y espera al cierre del source", async (caseTest) => {
      const old = await imageId()
      const lease = await runtime!.acquireReceipt()
      const source = new PassThrough()
      const receiving = lease.runOwned(() => receiveAchievementImage(source, headers, target,
        { temporaryRoot: root, signal: lease.signal }, database)).then(() => "unexpected", () => "canceled").finally(lease.release)
      caseTest.after(async () => { source.destroy(); await receiving; lease.release() })
      source.write(Buffer.concat([prefix, png.subarray(0, 32)]))
      const job = await waitFor(() => db.mediaJob.findFirst({ where: { ownerId: fixture.admin.id, status: "RECEIVING" } }))
      const response = await cancel(job.id)
      assert.equal(response.status, 202)
      assert.equal(await receiving, "canceled")
      assert.equal(source.closed, true)
      assert.equal((await row(job.id)).status, "CANCELED")
      assert.equal((await row(job.id)).activeResourceKey, null)
      assert.equal(await imageId(), old)
    })
  } finally {
    for (const held of gates) held.release()
    await runtime?.stop()
    if (server) await new Promise<void>((resolveClosed) => server!.close(() => resolveClosed()))
    for (const key of keys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
    await db.logro.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: fixture.team.id } } })
    await db.mediaAsset.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaJob.deleteMany({ where: { ownerId: fixture.admin.id } })
    if (runtime) await db.mediaRuntimeOwner.delete({ where: { id: runtime.ownerId } })
    await db.teamMembership.deleteMany({ where: { teamId: { in: [fixture.team.id, fixture.other.id] } } })
    await db.team.deleteMany({ where: { id: { in: [fixture.team.id, fixture.other.id] } } })
    await db.user.deleteMany({ where: { id: { in: [fixture.admin.id, fixture.second.id, fixture.player.id] } } })
    assert.equal(dirname(root), tempBase)
    assert.ok(root.startsWith(join(tempBase, "media-cancellation-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    verifier.destroy()
    store.destroy()
    await Promise.all([db.$disconnect(), prisma.$disconnect()])
  }
})
