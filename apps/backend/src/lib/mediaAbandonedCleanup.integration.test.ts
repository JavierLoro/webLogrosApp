import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { hostname, tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { PrismaClient, type Prisma, type MediaJobState } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { DATABASE_URL } from "../config/env"
import { createMediaAbandonedCleanup, type MediaAbandonedCleanupOptions, type MediaAbandonedCleanupReport } from "./mediaAbandonedCleanup"
import * as cleanupModule from "./mediaAbandonedCleanup"
import { createMediaRuntime, type MediaRuntime } from "./mediaRuntime"

const fs = require("node:fs/promises") as typeof import("node:fs/promises")

const DAY = 86_400_000
const ROOT_MARKER = ".weblogros-media-root"
const RECEIPT_MARKER = ".receipt-owner.json"

// 📚 El reloj inyectado prueba la frontera exacta sin esperar 24 horas reales;
// 📚 carpetas, consultas, journal y borrados siguen siendo operaciones reales.
test("barrido de abandonados verifica edad, propiedad, actividad y reanudación", {
  skip: process.env.MEDIA_ABANDONED_CLEANUP_TEST !== "1", timeout: 180_000,
}, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), members: await db.teamMembership.count(),
    achievements: await db.logro.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(),
    cleanups: await db.mediaAssetCleanup.count(), owners: await db.mediaRuntimeOwner.count(), orphans: await db.mediaOrphanCleanup.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0)
  const fixture = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: `abandoned-${randomUUID()}@example.invalid`, password: "fixture-only" } })
    const team = await tx.team.create({ data: { slug: `abandoned-${randomUUID()}`, nombre: "Abandoned fixtures" } })
    await tx.teamMembership.create({ data: { userId: user.id, teamId: team.id, role: "TEAM_ADMIN" } })
    return { user, team }
  })
  const base = await fs.realpath(tmpdir())
  const contexts: Array<Awaited<ReturnType<typeof context>>> = []
  async function context() {
    const root = await fs.realpath(await fs.mkdtemp(join(base, "media-abandoned-test-")))
    await fs.writeFile(join(root, ROOT_MARKER), "weblogros-media-runtime-v1\n")
    const current = await db.mediaRuntimeOwner.create({ data: { hostId: hostname(), processId: process.pid, temporaryRoot: root } })
    const previous = await db.mediaRuntimeOwner.create({ data: { hostId: hostname(), processId: process.pid,
      temporaryRoot: root, closedAt: new Date(Date.now() - 3 * DAY) } })
    return { root, current, previous, runtime: undefined as MediaRuntime | undefined, releases: [] as Array<() => void>,
      options: { temporaryRoot: root, currentOwnerId: current.id, getProtectedJobIds: () => [], getActiveReceiptIds: () => [] } as MediaAbandonedCleanupOptions }
  }
  const dispose = async (ctx: Awaited<ReturnType<typeof context>>) => {
    for (const release of ctx.releases) release()
    await ctx.runtime?.stop()
    const owners = (await db.mediaRuntimeOwner.findMany({ where: { temporaryRoot: ctx.root }, select: { id: true } })).map(({ id }) => id)
    const jobs = (await db.mediaJob.findMany({ where: { runtimeOwnerId: { in: owners } }, select: { id: true } })).map(({ id }) => id)
    const assets = (await db.mediaAsset.findMany({ where: { jobId: { in: jobs } }, select: { id: true } })).map(({ id }) => id)
    await db.logro.deleteMany({ where: { imageAssetId: { in: assets } } })
    await db.mediaAssetCleanup.deleteMany({ where: { assetId: { in: assets } } })
    await db.mediaAsset.deleteMany({ where: { id: { in: assets } } })
    await db.mediaJob.deleteMany({ where: { id: { in: jobs } } })
    await db.mediaOrphanCleanup.deleteMany({ where: { temporaryRoot: ctx.root } })
    await db.mediaRuntimeOwner.deleteMany({ where: { id: { in: owners } } })
    assert.equal(dirname(ctx.root), base)
    assert.ok(ctx.root.startsWith(join(base, "media-abandoned-test-")))
    if (await fs.lstat(ctx.root).then(() => true, () => false)) {
      assert.equal(await fs.realpath(ctx.root), ctx.root)
      await fs.rm(ctx.root, { recursive: true })
    }
  }
  const use = async (caseTest: { after: (fn: () => Promise<void>) => void }) => {
    const ctx = await context()
    contexts.push(ctx)
    caseTest.after(() => dispose(ctx))
    return ctx
  }
  const workspace = async (ctx: Awaited<ReturnType<typeof context>>, id = randomUUID(), owner = ctx.previous.id) => {
    const path = join(ctx.root, id)
    const receiptToken = randomUUID()
    await fs.mkdir(join(path, "variants-fixture"), { recursive: true })
    await fs.writeFile(join(path, RECEIPT_MARKER), JSON.stringify({ jobId: id, runtimeOwnerId: owner, receiptToken }))
    await fs.writeFile(join(path, "input.tmp"), "own-input")
    await fs.writeFile(join(path, "variants-fixture", "image-320x200.png"), "own-variant")
    return { id, path, receiptToken }
  }
  const activity = async (path: string): Promise<number> => {
    const info = await fs.lstat(path)
    let latest = Math.max(info.mtimeMs, info.ctimeMs)
    if (info.isDirectory() && !info.isSymbolicLink()) {
      for (const name of await fs.readdir(path)) latest = Math.max(latest, await activity(join(path, name)))
    }
    return latest
  }
  const sweep = (ctx: Awaited<ReturnType<typeof context>>, now: number, database = db) =>
    createMediaAbandonedCleanup({ now: () => new Date(now) })(ctx.options, database)
  const jobFor = async (ctx: Awaited<ReturnType<typeof context>>, item: Awaited<ReturnType<typeof workspace>>, status: MediaJobState) => {
    const active = ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"].includes(status)
    const processing = ["PROCESSING", "PUBLISHING"].includes(status)
    const resourceKey = `abandoned:${item.id}`
    return db.mediaJob.create({ data: { id: item.id, ownerId: fixture.user.id, teamId: fixture.team.id,
      runtimeOwnerId: ctx.previous.id, runtimeReceiptId: randomUUID(), receiptToken: item.receiptToken,
      receiptStartedAt: new Date(Date.now() - 3 * DAY), inputDirectory: item.path, imageKind: "achievement",
      resourceKey, activeResourceKey: active ? resourceKey : null, status,
      ...(status !== "RECEIVING" && active ? { queuedAt: new Date(Date.now() - 3 * DAY), queueExpiresAt: new Date(Date.now() - 3 * DAY + 180_000) } : {}),
      ...(processing ? { processingSlot: 1, executionToken: randomUUID(), processingStartedAt: new Date(Date.now() - 3 * DAY) } : {}),
      ...(status === "PUBLISHING" ? { executorStartedAt: new Date(), resultDirectory: join(item.path, "variants-fixture"), resultManifest: {} } : {}),
      ...(!active ? { completedAt: new Date(Date.now() - 3 * DAY), cleanupPendingDirectory: item.path } : {}),
      updatedAt: new Date(Date.now() - 3 * DAY),
    } })
  }
  try {
    await t.test("24h es una frontera inclusiva y el journal precede al borrado", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const latest = await activity(item.path)
      assert.equal((await sweep(ctx, latest + DAY - 1)).cleaned, 0)
      assert.equal(await db.mediaOrphanCleanup.count({ where: { jobId: item.id } }), 0)
      const unlink = fs.unlink
      let journalSeen = false
      ;(fs as { unlink: typeof fs.unlink }).unlink = async (path) => {
        if (path.toString() === join(item.path, "input.tmp")) {
          assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "PENDING")
          journalSeen = true
        }
        return unlink(path)
      }
      try { assert.equal((await sweep(ctx, latest + DAY)).cleaned, 1) }
      finally { (fs as { unlink: typeof fs.unlink }).unlink = unlink }
      assert.equal(journalSeen, true)
      await assert.rejects(fs.lstat(item.path), { code: "ENOENT" })
      assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "COMPLETE")
      assert.equal((await sweep(ctx, latest + 2 * DAY)).cleaned, 0)
    })
    await t.test("mtime reciente, ctime reciente y cierre reciente del owner conservan restos", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const latest = await activity(item.path)
      // 📚 Envejecer solo mtime no convierte una creación reciente en abandonada.
      await fs.utimes(join(item.path, "input.tmp"), new Date(latest - 3 * DAY), new Date(latest - 3 * DAY))
      assert.equal((await sweep(ctx, latest + 1000)).cleaned, 0)
      const now = latest + 2 * DAY
      await fs.utimes(join(item.path, "input.tmp"), new Date(now - 3600_000), new Date(now - 3600_000))
      assert.equal((await sweep(ctx, now)).cleaned, 0)
      await db.mediaRuntimeOwner.update({ where: { id: ctx.previous.id }, data: { closedAt: new Date(now) } })
      assert.equal((await sweep(ctx, now + 3600_000)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
    })
    await t.test("ningún estado activo se borra por antigüedad", async (caseTest) => {
      const ctx = await use(caseTest)
      for (const status of ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] as const) {
        const item = await workspace(ctx)
        await jobFor(ctx, item, status)
        assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
        assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: item.id } })).status, status)
        assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
        await db.mediaJob.delete({ where: { id: item.id } })
        assert.equal(dirname(item.path), ctx.root)
        assert.equal(await fs.realpath(item.path), item.path)
        await fs.rm(item.path, { recursive: true })
      }
    })
    await t.test("owner actual, owner vivo y tareas protegidas nunca se adoptan", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx, randomUUID(), ctx.current.id)
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: item.id, runtimeOwnerId: ctx.previous.id, receiptToken: item.receiptToken }))
      await db.mediaRuntimeOwner.update({ where: { id: ctx.previous.id }, data: { closedAt: null } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await db.mediaRuntimeOwner.update({ where: { id: ctx.previous.id }, data: { closedAt: new Date(Date.now() - 3 * DAY) } })
      ctx.options.getProtectedJobIds = () => [item.id]
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      assert.equal(await db.mediaOrphanCleanup.count({ where: { jobId: item.id } }), 0)
    })
    await t.test("marker ausente, ajeno, owner desconocido y host ajeno quedan conservados", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await fs.unlink(join(item.path, RECEIPT_MARKER))
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: randomUUID(), runtimeOwnerId: ctx.previous.id, receiptToken: item.receiptToken }))
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: item.id, runtimeOwnerId: randomUUID(), receiptToken: item.receiptToken }))
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: item.id, runtimeOwnerId: ctx.previous.id, receiptToken: item.receiptToken }))
      await db.mediaRuntimeOwner.update({ where: { id: ctx.previous.id }, data: { hostId: `${hostname()}-foreign` } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
    })
    await t.test("archivo desconocido y junction se revisan antes de borrar cualquier input", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await fs.writeFile(join(item.path, "keep-me.txt"), "foreign")
      const report = await sweep(ctx, Date.now() + 4 * DAY)
      assert.ok(report.quarantined > 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      const protectedPath = join(ctx.root, "protected-target")
      await fs.mkdir(protectedPath)
      await fs.writeFile(join(protectedPath, "keep-me.txt"), "protected")
      const junction = join(ctx.root, randomUUID())
      await fs.symlink(protectedPath, junction, "junction")
      try {
        assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
        assert.equal(await fs.readFile(join(protectedPath, "keep-me.txt"), "utf8"), "protected")
      } finally { await fs.unlink(junction) }
    })
    await t.test("referencias de otro trabajo impiden adoptar un workspace sin fila propia", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const reference = await db.mediaJob.create({ data: { ownerId: fixture.user.id, teamId: fixture.team.id, runtimeOwnerId: ctx.current.id,
        resourceKey: `foreign-reference:${item.id}`, status: "FAILED", completedAt: new Date(),
        inputDirectory: join(item.path, "variants-fixture"), imageKind: "achievement" } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      if (process.platform === "win32") {
        await db.mediaJob.update({ where: { id: reference.id }, data: { inputDirectory: join(item.path, "variants-fixture").toUpperCase() } })
        assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      }
      assert.equal(await db.mediaOrphanCleanup.count({ where: { jobId: item.id } }), 0)
    })
    await t.test("un terminal no borra referencias ajenas ni un worker cuyo PID sigue vivo", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await jobFor(ctx, item, "FAILED")
      const reference = await db.mediaJob.create({ data: { ownerId: fixture.user.id, teamId: fixture.team.id, runtimeOwnerId: ctx.current.id,
        resourceKey: `terminal-reference:${item.id}`, status: "FAILED", completedAt: new Date(), inputDirectory: item.path } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await db.mediaJob.delete({ where: { id: reference.id } })
      await db.mediaJob.update({ where: { id: item.id }, data: { workerPid: process.pid, workerDirectory: join(item.path, "variants-fixture") } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      await db.mediaJob.update({ where: { id: item.id }, data: { workerPid: null, workerDirectory: null } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
      assert.ok((await db.mediaJob.findUniqueOrThrow({ where: { id: item.id } })).temporaryCleanedAt)
    })
    await t.test("una modificación reciente del trabajo retrasa elegibilidad del terminal", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await jobFor(ctx, item, "FAILED")
      const now = Date.now() + 4 * DAY
      await db.mediaJob.update({ where: { id: item.id }, data: { updatedAt: new Date(now - 1000) } })
      assert.equal((await sweep(ctx, now)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
    })
    await t.test("el borrado de un terminal respeta abort antes de tocar sus archivos", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await jobFor(ctx, item, "FAILED")
      const abort = new AbortController()
      ctx.options.signal = abort.signal
      const faulty = new Proxy(db, { get(target, field) {
        if (field === "mediaJob") return new Proxy(target.mediaJob, { get(delegate, method) {
          if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
            const result = await delegate.updateMany(args)
            if (args.data.cleanupPendingDirectory) abort.abort()
            return result
          }
          const value = Reflect.get(delegate, method, delegate)
          return typeof value === "function" ? value.bind(delegate) : value
        } })
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY, faulty)).cleaned, 0)
      assert.equal(abort.signal.aborted, true)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      assert.equal(await fs.readFile(join(item.path, "variants-fixture", "image-320x200.png"), "utf8"), "own-variant")
    })
    await t.test("un temporal reaparecido con sello previo no se declara falsamente limpio", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await jobFor(ctx, item, "FAILED")
      await db.mediaJob.update({ where: { id: item.id }, data: { temporaryCleanedAt: new Date(Date.now() - 3 * DAY), updatedAt: new Date(Date.now() - 3 * DAY) } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
    })
    await t.test("limpiar el original temporal conserva asset READY y referencia del logro", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      await jobFor(ctx, item, "SUCCEEDED")
      const asset = await db.mediaAsset.create({ data: { jobId: item.id, teamId: fixture.team.id, state: "READY", variants: [] } })
      const logro = await db.logro.create({ data: { teamId: fixture.team.id, nombre: "Image reference fixture", puntos: 1, imageAssetId: asset.id } })
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
      assert.equal((await db.logro.findUniqueOrThrow({ where: { id: logro.id } })).imageAssetId, asset.id)
      assert.equal((await db.mediaAsset.findUniqueOrThrow({ where: { id: asset.id } })).state, "READY")
    })
    await t.test("fallo de disco deja journal pendiente y otra instancia de limpiador lo retoma", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const now = Date.now() + 4 * DAY
      const unlink = fs.unlink
      let fail = true
      ;(fs as { unlink: typeof fs.unlink }).unlink = async (path) => {
        if (path.toString() === join(item.path, RECEIPT_MARKER) && fail) {
          fail = false
          throw Object.assign(new Error("fixture-denied"), { code: "EACCES" })
        }
        return unlink(path)
      }
      try { assert.ok((await sweep(ctx, now)).pending > 0) }
      finally { (fs as { unlink: typeof fs.unlink }).unlink = unlink }
      const pending = await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })
      assert.equal(pending.status, "PENDING")
      assert.equal(pending.lastErrorCode, "EACCES")
      assert.ok(pending.attempts > 0)
      assert.equal((await sweep(ctx, now)).cleaned, 1)
      await assert.rejects(fs.lstat(item.path), { code: "ENOENT" })
    })
    await t.test("acuse final de limpieza perdido se repara aunque la carpeta ya no exista", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      let fail = true
      const faulty = new Proxy(db, { get(target, field) {
        if (field === "mediaOrphanCleanup") return new Proxy(target.mediaOrphanCleanup, { get(delegate, method) {
          if (method === "updateMany") return async (args: Prisma.MediaOrphanCleanupUpdateManyArgs) => {
            if (args.data.status === "COMPLETE" && fail) { fail = false; throw new Error("injected-before-cleanup-ack") }
            return delegate.updateMany(args)
          }
          const value = Reflect.get(delegate, method, delegate)
          return typeof value === "function" ? value.bind(delegate) : value
        } })
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      await sweep(ctx, Date.now() + 4 * DAY, faulty)
      assert.equal(fail, false)
      await assert.rejects(fs.lstat(item.path), { code: "ENOENT" })
      assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "PENDING")
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
      assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "COMPLETE")
    })
    await t.test("un PENDING no autoriza borrar un input recién reaparecido", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const now = Date.now() + 4 * DAY
      const unlink = fs.unlink
      ;(fs as { unlink: typeof fs.unlink }).unlink = async (path) => {
        if (path.toString() === join(item.path, RECEIPT_MARKER)) throw Object.assign(new Error("fixture-denied"), { code: "EACCES" })
        return unlink(path)
      }
      try { assert.ok((await sweep(ctx, now)).pending > 0) }
      finally { (fs as { unlink: typeof fs.unlink }).unlink = unlink }
      await fs.writeFile(join(item.path, "input.tmp"), "new-input")
      await fs.utimes(join(item.path, "input.tmp"), new Date(now - 3600_000), new Date(now - 3600_000))
      assert.equal((await sweep(ctx, now)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "new-input")
      assert.equal((await sweep(ctx, now)).cleaned, 0)
      assert.equal((await sweep(ctx, now + DAY)).cleaned, 1)
    })
    await t.test("caída después de quitar marker retoma únicamente rmdir vacío", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const rmdir = fs.rmdir
      ;(fs as { rmdir: typeof fs.rmdir }).rmdir = async (path, ...rest) => {
        if (path.toString() === item.path) throw Object.assign(new Error("fixture-dir-denied"), { code: "EACCES" })
        return rmdir(path, ...rest)
      }
      try { assert.ok((await sweep(ctx, Date.now() + 4 * DAY)).pending > 0) }
      finally { (fs as { rmdir: typeof fs.rmdir }).rmdir = rmdir }
      assert.deepEqual(await fs.readdir(item.path), [])
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
    })
    await t.test("owner actual falso y raíz con marker inválido no permiten borrar", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const current = ctx.options.currentOwnerId
      ctx.options.currentOwnerId = randomUUID()
      assert.ok((await sweep(ctx, Date.now() + 4 * DAY)).errors > 0)
      ctx.options.currentOwnerId = current
      await fs.writeFile(join(ctx.root, ROOT_MARKER), "foreign-root")
      assert.ok((await sweep(ctx, Date.now() + 4 * DAY)).errors > 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      assert.equal(await db.mediaOrphanCleanup.count({ where: { jobId: item.id } }), 0)
    })
    await t.test("abortar después de journalizar conserva input para otro barrido", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const abort = new AbortController()
      ctx.options.signal = abort.signal
      const faulty = new Proxy(db, { get(target, field) {
        if (field === "$transaction") return async (...args: unknown[]) => {
          const result = await Reflect.apply(target.$transaction, target, args)
          abort.abort()
          return result
        }
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY, faulty)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      delete ctx.options.signal
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
    })
    await t.test("referencia aparecida después del journal se vuelve a comprobar antes de borrar", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      let added = false
      const faulty = new Proxy(db, { get(target, field) {
        if (field === "$transaction") return async (...args: unknown[]) => {
          const result = await Reflect.apply(target.$transaction, target, args)
          if (!added) {
            added = true
            await db.mediaJob.create({ data: { ownerId: fixture.user.id, teamId: fixture.team.id, runtimeOwnerId: ctx.current.id,
              resourceKey: `late-reference:${item.id}`, status: "FAILED", completedAt: new Date(), inputDirectory: item.path } })
          }
          return result
        }
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY, faulty)).cleaned, 0)
      assert.equal(added, true)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "PENDING")
    })
    await t.test("si falla consultar referencias de DB no se infiere que el archivo esté huérfano", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      const faulty = new Proxy(db, { get(target, field) {
        if (field === "$queryRaw") return async () => { throw new Error("injected-reference-db-error") }
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      const report = await sweep(ctx, Date.now() + 4 * DAY, faulty)
      assert.equal(report.cleaned, 0)
      assert.ok(report.errors > 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      assert.equal(await db.mediaOrphanCleanup.count({ where: { jobId: item.id } }), 0)
      const lostAck = new Proxy(db, { get(target, field) {
        if (field === "$transaction") return async (...args: unknown[]) => {
          await Reflect.apply(target.$transaction, target, args)
          throw new Error("injected-journal-creation-lost-ack")
        }
        const value = Reflect.get(target, field, target)
        return typeof value === "function" ? value.bind(target) : value
      } }) as PrismaClient
      assert.ok((await sweep(ctx, Date.now() + 4 * DAY, lostAck)).errors > 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "own-input")
      assert.equal((await db.mediaOrphanCleanup.findUniqueOrThrow({ where: { jobId: item.id } })).status, "PENDING")
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
    })
    await t.test("el cursor deja pasar archivos elegibles detrás de uno desconocido", async (caseTest) => {
      const ctx = await use(caseTest)
      const first = await workspace(ctx, "00000000-0000-4000-8000-000000000001")
      await fs.writeFile(join(first.path, "keep-me.txt"), "foreign")
      await workspace(ctx, "00000000-0000-4000-8000-000000000002")
      await workspace(ctx, "00000000-0000-4000-8000-000000000003")
      ctx.options.batchSize = 1
      const scan = createMediaAbandonedCleanup({ now: () => new Date(Date.now() + 4 * DAY) })
      let cleaned = 0
      for (let page = 0; page < 5; page++) {
        const report = await scan(ctx.options, db)
        assert.ok(report.scanned <= 1)
        cleaned += report.cleaned
        if (!report.hasMore) break
        ctx.options.cursor = report.nextCursor ?? undefined
      }
      assert.equal(cleaned, 2)
      assert.equal(await fs.readFile(join(first.path, "keep-me.txt"), "utf8"), "foreign")
    })
    await t.test("un COMPLETE reaparecido debe esperar de nuevo 24h", async (caseTest) => {
      const ctx = await use(caseTest)
      const item = await workspace(ctx)
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 1)
      await fs.mkdir(item.path)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: item.id, runtimeOwnerId: ctx.previous.id, receiptToken: item.receiptToken }))
      await fs.writeFile(join(item.path, "input.tmp"), "own-reappeared")
      const latest = await activity(item.path)
      assert.equal((await sweep(ctx, latest + DAY - 1)).cleaned, 0)
      assert.equal((await sweep(ctx, latest + DAY)).cleaned, 1)
      await fs.mkdir(item.path)
      await fs.writeFile(join(item.path, RECEIPT_MARKER), JSON.stringify({ jobId: item.id, runtimeOwnerId: ctx.previous.id, receiptToken: randomUUID() }))
      await fs.writeFile(join(item.path, "input.tmp"), "different-receipt")
      assert.equal((await sweep(ctx, Date.now() + 4 * DAY)).cleaned, 0)
      assert.equal(await fs.readFile(join(item.path, "input.tmp"), "utf8"), "different-receipt")
    })
    await t.test("arranque drena lotes y el poll horario se espera al detener el runtime", async (caseTest) => {
      const ctx = await use(caseTest)
      const original = cleanupModule.sweepAbandonedMediaFiles
      const realNow = Date.now
      let calls = 0
      let hold = false
      let release!: () => void
      let entered!: () => void
      let signal: AbortSignal | undefined
      const reached = new Promise<void>((resolveReached) => { entered = resolveReached })
      const gate = new Promise<void>((resolveGate) => { release = resolveGate })
      ctx.releases.push(release)
      const empty: MediaAbandonedCleanupReport = { scanned: 0, eligible: 0, cleaned: 0, pending: 0, quarantined: 0, skipped: 0, errors: 0, nextCursor: null, hasMore: false }
      ;(cleanupModule as { sweepAbandonedMediaFiles: typeof original }).sweepAbandonedMediaFiles = async (options) => {
        calls++
        signal = options.signal
        if (hold) { entered(); await gate }
        return { ...empty, hasMore: calls < 3, nextCursor: calls < 3 ? `00000000-0000-4000-8000-00000000000${calls}` : null }
      }
      let destroyed = false
      const objects = new Map<string, { bytes: Uint8Array; type: string }>()
      try {
        ctx.runtime = await createMediaRuntime({ temporaryRoot: ctx.root, db, pollIntervalMs: 60_000, store: {
          async put(key, bytes, type) { objects.set(key, { bytes, type }) },
          async head(key) { const item = objects.get(key); return item ? { contentLength: item.bytes.byteLength, contentType: item.type } : null },
          async get(key) { const item = objects.get(key); return item ? { body: Readable.from([item.bytes]), contentLength: item.bytes.byteLength, contentType: item.type } : null },
          async delete(key) { objects.delete(key) }, destroy() { destroyed = true },
        } })
        assert.equal(calls, 3, "el arranque debe drenar todas las páginas antes de aceptar")
        await delay(50)
        hold = true
        Date.now = () => realNow() + 3_600_001
        ctx.runtime.wake()
        await reached
        const stopping = ctx.runtime.stop()
        assert.equal(signal?.aborted, true)
        assert.equal(destroyed, false)
        release()
        await stopping
        assert.equal(destroyed, true)
      } finally {
        release()
        Date.now = realNow
        ;(cleanupModule as { sweepAbandonedMediaFiles: typeof original }).sweepAbandonedMediaFiles = original
      }
    })
  } finally {
    for (const ctx of contexts) if (await fs.lstat(ctx.root).then(() => true, () => false)) await dispose(ctx)
    await db.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
    await db.team.delete({ where: { id: fixture.team.id } })
    await db.user.delete({ where: { id: fixture.user.id } })
    assert.deepEqual(await counts(), before)
    await db.$disconnect()
  }
})
