import assert from "node:assert/strict"
import { fork, type ChildProcess } from "node:child_process"
import { randomUUID } from "node:crypto"
import { once } from "node:events"
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import sharp from "sharp"
import { DATABASE_URL } from "../config/env"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import { receiveAchievementImage } from "./mediaAchievementTarget"
import { createMediaRuntime, type MediaRuntime } from "./mediaRuntime"
import { mediaAssetVariantSchema } from "./mediaPublication"
import { cleanupMediaAssetCleanup } from "./mediaAssetCleanup"
import { recoverMediaJobs } from "./mediaJobRecovery"
import { requestMediaJobCancellation } from "./mediaJobCancellation"
import { ObjectStore } from "./objectStore"

// 📚 Los cinco primeros casos matan un backend hijo de verdad en distintos
// 📚 puntos; el nuevo runtime debe resolver DB/S3/temporales sin repetir Sharp.
test("recuperación durable tras caídas y pérdida de acuses", {
  skip: process.env.MEDIA_JOB_RECOVERY_TEST !== "1", timeout: 180_000,
}, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv()
  assert.equal(new URL(config.endpoint).hostname, "127.0.0.1")
  assert.equal(new URL(config.endpoint).port, "8333")
  assert.equal(config.bucket, "lockerboard-media-dev")
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const verifier = new ObjectStore(config)
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), members: await db.teamMembership.count(),
    achievements: await db.logro.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(),
    cleanups: await db.mediaAssetCleanup.count(), owners: await db.mediaRuntimeOwner.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0)
  const run = randomUUID()
  const fixture = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: `media-recovery-${run}@example.invalid`, password: "integration-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Recovery fixture", slug: `media-recovery-${run}` } })
    await tx.teamMembership.create({ data: { userId: user.id, teamId: team.id, role: "TEAM_ADMIN" } })
    const logro = await tx.logro.create({ data: { nombre: "Recovery image", puntos: 1, teamId: team.id } })
    return { user, team, logro }
  })
  const tempBase = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(tempBase, "media-recovery-test-")))
  const children = new Set<ChildProcess>()
  const runtimes: MediaRuntime[] = []
  const objectKeys = new Set<string>()
  const trackedStore = () => {
    const store = new ObjectStore(config)
    return { async put(key: string, bytes: Uint8Array, type: string) { objectKeys.add(key); await store.put(key, bytes, type) },
      head: store.head.bind(store), get: store.get.bind(store), delete: store.delete.bind(store), destroy: store.destroy.bind(store) }
  }
  const start = async (database = db) => {
    const runtime = await createMediaRuntime({ temporaryRoot: root, store: trackedStore(), db: database, pollIntervalMs: 100 })
    runtimes.push(runtime)
    return runtime
  }
  const waitFor = async <T>(read: () => Promise<T | null | undefined | false>): Promise<T> => {
    for (let attempt = 0; attempt < 300; attempt++) {
      const result = await read()
      if (result) return result
      await delay(20)
    }
    throw new Error("La recuperación no llegó al estado esperado en 6s")
  }
  const kill = async (child: ChildProcess) => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close")
      child.kill("SIGKILL")
      await closed
    }
  }
  const variants = (json: Prisma.JsonValue) => {
    assert.ok(Array.isArray(json))
    return json.map((row) => mediaAssetVariantSchema.parse(row))
  }
  const recordKeys = async () => {
    for (const asset of await db.mediaAsset.findMany({ where: { teamId: fixture.team.id } })) {
      variants(asset.variants).forEach(({ key }) => objectKeys.add(key))
    }
  }
  const boundary = "recovery-current-runtime"
  const png = await sharp({ create: { width: 1300, height: 900, channels: 4, background: "#55668880" } }).png().toBuffer()
  const enqueue = async (runtime: MediaRuntime, database = db) => {
    const lease = await runtime.acquireReceipt()
    try {
      return (await lease.runOwned(() => receiveAchievementImage(Readable.from([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n`),
        png, Buffer.from(`\r\n--${boundary}--\r\n`),
      ]), { "content-type": `multipart/form-data; boundary=${boundary}` }, {
        ownerId: fixture.user.id, teamId: fixture.team.id, achievementId: fixture.logro.id,
      }, { temporaryRoot: root, signal: lease.signal }, database))).job
    } finally { lease.release() }
  }
  try {
    const crashes = (["receiving", "queued", "processing", "publishing", "committed"] as const)
      .map((stage) => ({ stage, cancelRequested: false }))
    crashes.push({ stage: "processing", cancelRequested: true })
    for (const { stage, cancelRequested } of crashes) {
      await t.test(`caída real en ${stage}${cancelRequested ? " con cancelación durable" : ""}: reinicio conserva la imagen vigente`, async (caseTest) => {
        const old = await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })
        const child = fork(join(__dirname, "../experiments/mediaRecoveryCrashProbe.js"), [], {
          env: { ...process.env, MEDIA_RECOVERY_CRASH_PROBE: "1" }, execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"],
        })
        children.add(child)
        caseTest.after(() => kill(child))
        let timer: NodeJS.Timeout | undefined
        const reached = new Promise<{ runtimeOwnerId: string; pid?: number }>((resolveStage, rejectStage) => {
          timer = setTimeout(() => rejectStage(new Error(`El actor no llegó a ${stage}`)), 15_000)
          child.on("message", (raw: unknown) => {
            const message = raw as { stage?: string; runtimeOwnerId: string; pid?: number }
            if (message.stage === "failed") rejectStage(new Error("El actor de crash falló antes del punto elegido"))
            if (message.stage === stage) resolveStage(message)
          })
          child.once("error", rejectStage)
          child.once("exit", () => rejectStage(new Error("El actor terminó antes de confirmar el punto")))
        })
        child.send({ stage, temporaryRoot: root, ownerId: fixture.user.id, teamId: fixture.team.id, achievementId: fixture.logro.id })
        let ownerId: string
        try { ownerId = (await reached).runtimeOwnerId } finally { if (timer) clearTimeout(timer) }
        const job = await db.mediaJob.findFirstOrThrow({ where: { runtimeOwnerId: ownerId! }, orderBy: { createdAt: "desc" } })
        await kill(child)
        if (job.workerPid) await waitFor(async () => {
          try { process.kill(job.workerPid!, 0); return false } catch (error) {
            return error instanceof Error && "code" in error && error.code === "ESRCH"
          }
        })
        await recordKeys()
        if (cancelRequested) {
          const result = await requestMediaJobCancellation({ id: job.id, ownerId: fixture.user.id, teamId: fixture.team.id }, db)
          assert.equal(result.cancellation, "requested")
        }
        const runtime = await start()
        caseTest.after(() => runtime.stop())
        const recovered = await db.mediaJob.findUniqueOrThrow({ where: { id: job.id } })
        const achievement = await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })
        if (stage === "committed") {
          assert.equal(recovered.status, "SUCCEEDED")
          assert.ok(achievement.imageAssetId)
          const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: achievement.imageAssetId } })
          assert.equal(asset.state, "READY")
          for (const variant of variants(asset.variants)) assert.ok(await verifier.head(variant.key))
        } else {
          assert.equal(recovered.status, cancelRequested ? "CANCELED" : "INTERRUPTED")
          assert.equal(achievement.imageAssetId, old.imageAssetId)
          assert.equal(recovered.activeResourceKey, null)
          assert.equal(recovered.processingSlot, null)
          if (stage === "publishing") {
            const asset = await db.mediaAsset.findUniqueOrThrow({ where: { jobId: job.id } })
            assert.equal(asset.state, "RETIRED")
            for (const variant of variants(asset.variants)) assert.equal(await verifier.head(variant.key), null)
          }
        }
        await assert.rejects(lstat(join(root, job.id)), { code: "ENOENT" })
        assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: job.id } })).cleanupPendingDirectory, null)
        await runtime.stop()
      })
    }
    await t.test("una segunda instancia no puede adquirir la cola mientras la primera vive", async (caseTest) => {
      const runtime = await start()
      caseTest.after(() => runtime.stop())
      await assert.rejects(start(), /otro runtime/i)
      assert.equal(runtime.accepting(), true)
      await runtime.stop()
      const next = await start()
      caseTest.after(() => next.stop())
      await next.stop()
    })
    for (const mode of ["before", "after"] as const) {
      await t.test(`acuse perdido ${mode} del commit se reconcilia en el runtime vivo sin reprocesar`, async (caseTest) => {
        const old = await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })
        let failed = false
        const faulty = new Proxy(db, { get(target, property) {
          if (property === "$transaction") return async (callback: unknown, ...rest: unknown[]) => {
            if (typeof callback !== "function") return Reflect.apply(target.$transaction, target, [callback, ...rest])
            let final = false
            const result = await Reflect.apply(target.$transaction, target, [async (tx: Prisma.TransactionClient) => {
              const proxy = new Proxy(tx, { get(transaction, field) {
                if (field === "mediaJob") return new Proxy(transaction.mediaJob, { get(delegate, method) {
                  if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
                    const value = await delegate.updateMany(args)
                    if (args.data.status === "SUCCEEDED") final = true
                    return value
                  }
                  const value = Reflect.get(delegate, method, delegate)
                  return typeof value === "function" ? value.bind(delegate) : value
                } })
                const value = Reflect.get(transaction, field, transaction)
                return typeof value === "function" ? value.bind(transaction) : value
              } })
              const value = await callback(proxy)
              if (final && !failed && mode === "before") { failed = true; throw new Error("injected-final-rollback") }
              return value
            }, ...rest])
            if (final && !failed && mode === "after") { failed = true; throw new Error("injected-lost-ack") }
            return result
          }
          const value = Reflect.get(target, property, target)
          return typeof value === "function" ? value.bind(target) : value
        } }) as PrismaClient
        const runtime = await start(faulty)
        caseTest.after(() => runtime.stop())
        const queued = await enqueue(runtime, faulty)
        runtime.wake()
        const job = await waitFor(async () => {
          const row = await db.mediaJob.findUniqueOrThrow({ where: { id: queued.id } })
          return ["INTERRUPTED", "SUCCEEDED"].includes(row.status) && row.cleanupPendingDirectory === null ? row : false
        })
        assert.equal(failed, true)
        assert.equal(job.status, mode === "before" ? "INTERRUPTED" : "SUCCEEDED")
        const current = await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })
        if (mode === "before") assert.equal(current.imageAssetId, old.imageAssetId)
        else assert.notEqual(current.imageAssetId, old.imageAssetId)
        await runtime.stop()
      })
    }
    await t.test("recepción local sin callback activo se interrumpe, una recepción viva se conserva", async (caseTest) => {
      const runtime = await start()
      const lease = await runtime.acquireReceipt()
      let finish!: () => void
      const gate = new Promise<void>((resolveGate) => { finish = resolveGate })
      const work = lease.runOwned(async () => {
        const { admitReceivingMediaJob } = await import("./mediaJobAdmission")
        const job = await admitReceivingMediaJob({ ownerId: fixture.user.id, teamId: fixture.team.id,
          resourceKey: `recovery-test:${run}:receipt` }, db)
        await gate
        return job
      })
      caseTest.after(async () => { finish(); await work; lease.release(); await runtime.stop() })
      const row = await waitFor(() => db.mediaJob.findFirst({ where: { runtimeOwnerId: runtime.ownerId, resourceKey: `recovery-test:${run}:receipt` } }))
      await delay(250)
      assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: row.id } })).status, "RECEIVING")
      finish()
      await work
      lease.release()
      await waitFor(async () => (await db.mediaJob.findUniqueOrThrow({ where: { id: row.id } })).status === "INTERRUPTED")
      await runtime.stop()
    })
    await t.test("release anticipado no deja recuperar un callback que todavía trabaja", async (caseTest) => {
      const runtime = await start()
      const lease = await runtime.acquireReceipt()
      let finish!: () => void
      const gate = new Promise<void>((resolveGate) => { finish = resolveGate })
      const work = lease.runOwned(async () => {
        const { admitReceivingMediaJob } = await import("./mediaJobAdmission")
        const job = await admitReceivingMediaJob({ ownerId: fixture.user.id, teamId: fixture.team.id,
          resourceKey: `recovery-test:${run}:early-release` }, db)
        await gate
        return job
      })
      caseTest.after(async () => { finish(); await work; lease.release(); await runtime.stop() })
      const row = await waitFor(() => db.mediaJob.findFirst({ where: { resourceKey: `recovery-test:${run}:early-release` } }))
      lease.release()
      // 📚 Cruzamos un ciclo real de reconciliación: release solicita cierre, no demuestra que acabó el callback.
      await delay(2_200)
      assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: row.id } })).status, "RECEIVING")
      await assert.rejects(lease.runOwned(async () => undefined), /detenida/)
      finish()
      await work
      await waitFor(async () => (await db.mediaJob.findUniqueOrThrow({ where: { id: row.id } })).status === "INTERRUPTED")
      await runtime.stop()
    })
    await t.test("un PID de worker vivo conserva su plaza aunque no haya tarea local", async (caseTest) => {
      const runtime = await start()
      caseTest.after(() => runtime.stop())
      const id = randomUUID()
      const resourceKey = `recovery-test:${run}:live-worker`
      await db.mediaJob.create({ data: { id, ownerId: fixture.user.id, teamId: fixture.team.id,
        runtimeOwnerId: runtime.ownerId, resourceKey, activeResourceKey: resourceKey,
        status: "PROCESSING", processingSlot: 1, executionToken: randomUUID(), processingStartedAt: new Date(),
        queuedAt: new Date(), queueExpiresAt: new Date(Date.now() + 180_000),
        workerPid: process.pid, workerDirectory: join(root, id, "variants-live-proof") } })
      const report = await recoverMediaJobs({ temporaryRoot: root, previousOwners: [], currentOwnerId: runtime.ownerId,
        getProtectedJobIds: () => [], getActiveReceiptIds: () => [] }, verifier, db)
      assert.ok(report.skipped >= 1)
      const job = await db.mediaJob.findUniqueOrThrow({ where: { id } })
      assert.equal(job.status, "PROCESSING")
      assert.equal(job.processingSlot, 1)
      assert.equal(job.activeResourceKey, resourceKey)
      // 📚 El PID pertenece al propio test; retiramos solo su fixture, jamás matamos un proceso ajeno para liberar cupo.
      await db.mediaJob.delete({ where: { id } })
      await runtime.stop()
    })
    await t.test("RECEIVING y QUEUED sin owner bloquean el arranque de forma conservadora", async () => {
      for (const status of ["RECEIVING", "QUEUED"] as const) {
        const id = randomUUID()
        const resourceKey = `recovery-test:${run}:legacy:${status}`
        await db.mediaJob.create({ data: { id, ownerId: fixture.user.id, teamId: fixture.team.id,
          resourceKey, activeResourceKey: resourceKey, status,
          ...(status === "QUEUED" ? { queuedAt: new Date(), queueExpiresAt: new Date(Date.now() + 180_000) } : {}) } })
        try {
          await assert.rejects(start(), /sin propietario recuperable/)
          assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id } })).status, status)
        } finally { await db.mediaJob.delete({ where: { id } }) }
      }
    })
    await t.test("limpieza S3 fallida queda pendiente y retira un PUT que reaparece tarde", async () => {
      const cleanup = await db.mediaAssetCleanup.findFirstOrThrow({
        where: { asset: { teamId: fixture.team.id, state: "RETIRED" } }, orderBy: { createdAt: "asc" },
      })
      const key = cleanup.keys[0]!
      objectKeys.add(key)
      await verifier.put(key, Buffer.from("late-own-test-object"), "image/png")
      const failing = { head: verifier.head.bind(verifier), delete: async () => { throw new Error("injected-delete-failure") } }
      assert.equal((await cleanupMediaAssetCleanup(cleanup.id, failing, db)).status, "PENDING")
      assert.ok(await verifier.head(key))
      assert.equal((await db.mediaAssetCleanup.findUniqueOrThrow({ where: { id: cleanup.id } })).status, "PENDING")
      assert.equal((await cleanupMediaAssetCleanup(cleanup.id, verifier, db)).status, "COMPLETE")
      assert.equal(await verifier.head(key), null)
      await verifier.put(key, Buffer.from("second-late-own-object"), "image/png")
      assert.equal((await cleanupMediaAssetCleanup(cleanup.id, verifier, db)).status, "COMPLETE")
      assert.equal(await verifier.head(key), null)
      const current = await db.logro.findUniqueOrThrow({ where: { id: fixture.logro.id } })
      assert.ok(current.imageAssetId)
      const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: current.imageAssetId } })
      for (const variant of variants(asset.variants)) assert.ok(await verifier.head(variant.key))
    })
    await t.test("perder la sesión exclusiva detiene admisión y no afirma cierre limpio", async (caseTest) => {
      const runtime = await start()
      caseTest.after(() => runtime.stop())
      const locks = await db.$queryRaw<Array<{ pid: number }>>`
        SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND classid = 7100 AND objid = 2 AND granted
          AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
      `
      assert.equal(locks.length, 1)
      // 📚 Solo terminamos la conexión del lock que acaba de crear este test, en la base aislada verificada arriba.
      await db.$queryRaw`SELECT pg_terminate_backend(${locks[0]!.pid})`
      await waitFor(async () => !runtime.accepting())
      await assert.rejects(runtime.acquireReceipt(), /detenida/)
      await runtime.stop()
      assert.equal((await db.mediaRuntimeOwner.findUniqueOrThrow({ where: { id: runtime.ownerId } })).closedAt, null)
      // 📚 El PID del runner sigue vivo: solo su teardown confirma aquí que su runtime ya drenó.
      await db.mediaRuntimeOwner.update({ where: { id: runtime.ownerId }, data: { closedAt: new Date() } })
    })
    await t.test("perder el lock durante preflight impide terminar el arranque", async () => {
      const existing = new Set((await db.mediaRuntimeOwner.findMany({ select: { id: true } })).map(({ id }) => id))
      const store = trackedStore()
      let terminated = false
      const faulty = { ...store, async put(key: string, bytes: Uint8Array, type: string) {
        await store.put(key, bytes, type)
        if (key.startsWith("_weblogros/runtime-preflight/") && !terminated) {
          const locks = await db.$queryRaw<Array<{ pid: number }>>`
            SELECT pid FROM pg_locks WHERE locktype = 'advisory' AND classid = 7100 AND objid = 2 AND granted
              AND database = (SELECT oid FROM pg_database WHERE datname = current_database())
          `
          assert.equal(locks.length, 1)
          await db.$queryRaw`SELECT pg_terminate_backend(${locks[0]!.pid})`
          terminated = true
          await delay(50)
        }
      } }
      try {
        await assert.rejects(createMediaRuntime({ temporaryRoot: root, store: faulty, db }), /lock|arranque|destru|cerrad/i)
        assert.equal(terminated, true)
        const created = (await db.mediaRuntimeOwner.findMany({ where: { temporaryRoot: root } })).filter(({ id }) => !existing.has(id))
        assert.equal(created.length, 1)
        assert.equal(created[0]!.closedAt, null)
      } finally {
        await db.mediaRuntimeOwner.updateMany({ where: { temporaryRoot: root, id: { notIn: [...existing] } }, data: { closedAt: new Date() } })
        store.destroy()
      }
    })
  } finally {
    for (const child of children) await kill(child)
    for (const runtime of runtimes) await runtime.stop()
    await recordKeys()
    for (const key of objectKeys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
    await db.logro.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: fixture.team.id } } })
    await db.mediaAsset.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaJob.deleteMany({ where: { ownerId: fixture.user.id } })
    await db.mediaRuntimeOwner.deleteMany({ where: { temporaryRoot: root } })
    await db.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
    await db.team.delete({ where: { id: fixture.team.id } })
    await db.user.delete({ where: { id: fixture.user.id } })
    assert.equal(dirname(root), tempBase)
    assert.ok(root.startsWith(join(tempBase, "media-recovery-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    verifier.destroy()
    await db.$disconnect()
  }
})
