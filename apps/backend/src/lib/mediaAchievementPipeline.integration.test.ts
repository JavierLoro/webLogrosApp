import assert from "node:assert/strict"
import { createHash, randomUUID } from "node:crypto"
import { lstat, mkdtemp, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import sharp from "sharp"
import { DATABASE_URL } from "../config/env"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import { AppError } from "../errors/AppError"
import { receiveAchievementImage } from "./mediaAchievementTarget"
import { MediaJobController } from "./mediaJobController"
import { mediaAssetVariantSchema, type MediaPublicationStore } from "./mediaPublication"
import { cleanupMediaAssetCleanup } from "./mediaAssetCleanup"
import { ObjectStore } from "./objectStore"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"
import type { executeClaimedMediaJob as ExecuteClaimedMediaJob } from "./mediaJobExecution"

const boundary = "media-achievement-pipeline-fixture"
const headers = { "content-type": `multipart/form-data; boundary=${boundary}` }

// 📚 El test atraviesa servicios reales, PostgreSQL, procesos Sharp y SeaweedFS.
// 📚 Las únicas sustituciones fuerzan fallos concretos después de I/O real.
test("pipeline catálogo: recepción, Sharp, S3 privado y asociación atómica", {
  skip: process.env.MEDIA_ACHIEVEMENT_PIPELINE_TEST !== "1", timeout: 180_000,
}, async (t) => {
  const database = new URL(DATABASE_URL)
  assert.equal(database.hostname, "127.0.0.1")
  assert.equal(database.port, "55437")
  assert.equal(database.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv()
  assert.equal(new URL(config.endpoint).hostname, "127.0.0.1")
  assert.equal(new URL(config.endpoint).port, "8333")
  assert.equal(config.bucket, "lockerboard-media-dev")
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const realStore = new ObjectStore(config)
  const counts = async () => ({
    users: await db.user.count(), teams: await db.team.count(), memberships: await db.teamMembership.count(),
    achievements: await db.logro.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(),
    cleanups: await db.mediaAssetCleanup.count(),
  })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0)
  const run = randomUUID()
  const fixture = await db.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-pipeline-${run}@example.invalid`, password: "test-no-login" } })
    const player = await tx.user.create({ data: { email: `media-pipeline-player-${run}@example.invalid`, password: "test-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Pipeline fixture", slug: `media-pipeline-${run}` } })
    const otherTeam = await tx.team.create({ data: { nombre: "Other fixture", slug: `media-other-${run}` } })
    await tx.teamMembership.createMany({ data: [
      { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" },
      { userId: player.id, teamId: team.id, role: "PLAYER" },
    ] })
    return { owner, player, team, otherTeam }
  })
  const tempBase = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(tempBase, "media-pipeline-test-")))
  const allKeys = new Set<string>()
  const controllers: MediaJobController[] = []
  const errors: unknown[] = []
  const store: MediaPublicationStore = {
    async put(key, bytes, type) { allKeys.add(key); await realStore.put(key, bytes, type) },
    head: realStore.head.bind(realStore), get: realStore.get.bind(realStore), delete: realStore.delete.bind(realStore),
  }
  const makeController = (overrides: Partial<MediaPublicationStore> = {}, databaseClient = db) => {
    const controller = new MediaJobController({ temporaryRoot: root, store: { ...store, ...overrides }, db: databaseClient,
      onError: (error: unknown) => { errors.push(error) } })
    controllers.push(controller)
    return controller
  }
  const png = await sharp({ create: { width: 1500, height: 900, channels: 4, background: "#5544aa80" } }).png().toBuffer()
  const sourceFor = (bytes = png) => Readable.from([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="client.png"\r\nContent-Type: image/png\r\n\r\n`),
    bytes, Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const createAchievement = () => db.logro.create({ data: { nombre: `Pipeline ${randomUUID()}`, puntos: 10, teamId: fixture.team.id } })
  const enqueue = async (id: number, bytes = png) => (await receiveAchievementImage(sourceFor(bytes), headers,
    { ownerId: fixture.owner.id, teamId: fixture.team.id, achievementId: id }, { temporaryRoot: root }, db)).job
  const runJob = async (jobId: string, controller = makeController()) => {
    assert.equal(await controller.tick(), 1)
    await controller.idle()
    return db.mediaJob.findUniqueOrThrow({ where: { id: jobId } })
  }
  const assetFor = async (id: number) => {
    const logro = await db.logro.findUniqueOrThrow({ where: { id } })
    assert.ok(logro.imageAssetId)
    return db.mediaAsset.findUniqueOrThrow({ where: { id: logro.imageAssetId } })
  }
  const variantsFor = (json: Prisma.JsonValue) => {
    assert.ok(Array.isArray(json))
    return json.map((value) => mediaAssetVariantSchema.parse(value))
  }
  let existingAchievementId: number
  let previousKeys: string[] = []
  try {
    await t.test("imagen PNG completa con tres variantes privadas y sin original temporal", async () => {
      const logro = await createAchievement()
      existingAchievementId = logro.id
      const queued = await enqueue(logro.id)
      const job = await runJob(queued.id)
      assert.equal(job.status, "SUCCEEDED")
      assert.equal(job.processingSlot, null)
      assert.equal(job.activeResourceKey, null)
      const asset = await assetFor(logro.id)
      assert.equal(asset.state, "READY")
      const variants = variantsFor(asset.variants)
      assert.deepEqual(variants.map(({ width }) => width), [1280, 640, 320])
      previousKeys = variants.map(({ key }) => key)
      for (const variant of variants) {
        const object = await realStore.get(variant.key)
        assert.ok(object)
        const chunks: Buffer[] = []
        for await (const chunk of object.body) chunks.push(Buffer.from(chunk))
        const bytes = Buffer.concat(chunks)
        assert.equal(bytes.length, variant.size)
        assert.equal(createHash("sha256").update(bytes).digest("hex"), variant.sha256)
        const metadata = await sharp(bytes).metadata()
        assert.equal(metadata.width, variant.width)
        assert.equal(metadata.exif, undefined)
        assert.equal(metadata.hasAlpha, true)
      }
      const anon = await fetch(new URL(`${config.bucket}/${variants[0].key}`, config.endpoint))
      await anon.body?.cancel()
      assert.equal(anon.status, 403)
      await assert.rejects(lstat(join(root, queued.id)), { code: "ENOENT" })
      assert.equal(job.cleanupPendingDirectory, null)
    })
    await t.test("reemplazo conserva la anterior hasta confirmar nueva referencia y después la borra", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      const replacement = await enqueue(existingAchievementId)
      const job = await runJob(replacement.id, makeController({
        async put(key, bytes, type) {
          assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
          assert.ok(await realStore.head(previousKeys[0]))
          await store.put(key, bytes, type)
        },
      }))
      assert.equal(job.status, "SUCCEEDED")
      assert.notEqual((await assetFor(existingAchievementId)).id, oldAsset.id)
      for (const key of previousKeys) assert.equal(await realStore.head(key), null)
      for (const variant of variantsFor((await assetFor(existingAchievementId)).variants)) {
        assert.equal(previousKeys.includes(variant.key), false, "cada versión necesita claves inmutables diferentes")
        assert.ok(await realStore.head(variant.key))
      }
      assert.equal((await db.mediaAsset.findUniqueOrThrow({ where: { id: oldAsset.id } })).state, "RETIRED")
    })
    await t.test("PLAYER y destino de otro equipo no admiten ni reservan", async () => {
      for (const [ownerId, teamId, expected] of [
        [fixture.player.id, fixture.team.id, 403], [fixture.owner.id, fixture.otherTeam.id, 404],
      ]) {
        const initial = await db.mediaJob.count()
        const source = sourceFor()
        await assert.rejects(receiveAchievementImage(source, headers,
          { ownerId, teamId, achievementId: existingAchievementId }, { temporaryRoot: root }, db),
        (error: unknown) => error instanceof AppError && error.statusCode === expected)
        assert.equal(source.closed, true)
        assert.equal(await db.mediaJob.count(), initial)
      }
    })
    await t.test("JPEG usa sus bytes reales y publica image/jpeg sin depender del nombre cliente", async () => {
      const logro = await createAchievement()
      const jpeg = await sharp({ create: { width: 700, height: 500, channels: 3, background: "#225588" } }).jpeg().toBuffer()
      const queued = await enqueue(logro.id, jpeg)
      assert.equal((await runJob(queued.id)).status, "SUCCEEDED")
      for (const variant of variantsFor((await assetFor(logro.id)).variants)) {
        assert.equal(variant.format, "jpeg")
        assert.ok(variant.filename.endsWith(".jpg"))
        assert.equal((await realStore.head(variant.key))?.contentType, "image/jpeg")
      }
    })
    await t.test("un temporal perdido antes de Sharp libera solo su toma", async () => {
      const queued = await enqueue((await createAchievement()).id)
      await unlink(join(root, queued.id, "input.tmp"))
      const count = allKeys.size
      const job = await runJob(queued.id)
      assert.equal(job.status, "FAILED")
      assert.equal(job.failureCode, "WORKSPACE_INVALID")
      assert.equal(job.executorStartedAt, null)
      assert.equal(job.processingSlot, null)
      assert.equal(allKeys.size, count)
    })
    await t.test("la limpieza conserva un archivo ajeno y puede retomarse tras retirarlo", async () => {
      const queued = await enqueue((await createAchievement()).id)
      const foreign = join(root, queued.id, "keep.txt")
      await writeFile(foreign, "do-not-delete")
      const job = await runJob(queued.id)
      assert.equal(job.status, "SUCCEEDED")
      assert.equal(await readFile(foreign, "utf8"), "do-not-delete")
      assert.equal(job.cleanupPendingDirectory, join(root, queued.id))
      await unlink(foreign)
      assert.equal((await cleanupTerminalMediaJobTemporaryFiles(queued.id, root, db)).cleaned, true)
    })
    await t.test("fallo remoto después de PUT parcial conserva la referencia y limpia el intento", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      let puts = 0
      const staged: string[] = []
      const queued = await enqueue(existingAchievementId)
      const job = await runJob(queued.id, makeController({ async put(key, bytes, type) {
        staged.push(key)
        if (++puts === 2) throw new Error("injected-store-failure")
        await store.put(key, bytes, type)
      } }))
      assert.equal(job.status, "FAILED")
      assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
      for (const key of staged) assert.equal(await realStore.head(key), null)
      await assert.rejects(lstat(join(root, queued.id)), { code: "ENOENT" })
    })
    await t.test("verificación remota incorrecta impide SUCCEEDED", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      const queued = await enqueue(existingAchievementId)
      const job = await runJob(queued.id, makeController({ async head(key) {
        const info = await realStore.head(key)
        return info ? { ...info, contentLength: (info.contentLength ?? 0) + 1 } : null
      } }))
      assert.equal(job.status, "FAILED")
      assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
    })
    await t.test("cancelación durante la publicación no sustituye la imagen", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      const queued = await enqueue(existingAchievementId)
      let stop: Promise<void> | undefined
      const controller = makeController({ async put(key, bytes, type) {
        await store.put(key, bytes, type)
        stop ??= controller.stop()
      } })
      assert.equal(await controller.tick(), 1)
      await controller.idle()
      await stop
      assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: queued.id } })).status, "CANCELED")
      assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
    })
    await t.test("permiso revocado tras la subida se vuelve a comprobar antes de asociar", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      const queued = await enqueue(existingAchievementId)
      let revoked = false
      try {
        const job = await runJob(queued.id, makeController({ async put(key, bytes, type) {
          await store.put(key, bytes, type)
          if (!revoked) {
            revoked = true
            await db.teamMembership.update({ where: { userId_teamId: { userId: fixture.owner.id, teamId: fixture.team.id } }, data: { role: "PLAYER" } })
          }
        } }))
        assert.equal(job.status, "FAILED")
        assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
      } finally {
        await db.teamMembership.update({ where: { userId_teamId: { userId: fixture.owner.id, teamId: fixture.team.id } }, data: { role: "TEAM_ADMIN" } })
      }
    })
    await t.test("archivo con firma válida pero contenido roto falla en Sharp sin publicar", async () => {
      const logro = await createAchievement()
      const queued = await enqueue(logro.id, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]))
      const beforeKeys = allKeys.size
      const job = await runJob(queued.id)
      assert.equal(job.status, "FAILED")
      assert.equal(allKeys.size, beforeKeys)
      assert.equal((await db.logro.findUniqueOrThrow({ where: { id: logro.id } })).imageAssetId, null)
    })
    for (const failure of ["canceled", "manifest"] as const) {
      await t.test(`${failure === "canceled" ? "cancelación" : "manifiesto inválido"} antes del primer PUT libera la toma`, async () => {
        const logro = await createAchievement()
        const queued = await enqueue(logro.id)
        const executionModule = require("./mediaJobExecution") as { executeClaimedMediaJob: typeof ExecuteClaimedMediaJob }
        const execute = executionModule.executeClaimedMediaJob
        const controller = makeController()
        let stop: Promise<void> | undefined
        executionModule.executeClaimedMediaJob = async (...args) => {
          const result = await execute(...args)
          if (failure === "canceled") stop = controller.stop()
          else await db.mediaJob.update({ where: { id: queued.id }, data: { resultManifest: {} } })
          return result
        }
        try {
          const count = allKeys.size
          const job = await runJob(queued.id, controller)
          await stop
          assert.equal(job.status, failure === "canceled" ? "CANCELED" : "FAILED")
          assert.equal(job.processingSlot, null)
          assert.equal(job.activeResourceKey, null)
          assert.equal(allKeys.size, count)
          await assert.rejects(lstat(join(root, queued.id)), { code: "ENOENT" })
        } finally {
          executionModule.executeClaimedMediaJob = execute
        }
      })
    }
    await t.test("la limpieza S3 pendiente se puede retomar sin cambiar SUCCEEDED", async () => {
      const oldAsset = await assetFor(existingAchievementId)
      const queued = await enqueue(existingAchievementId)
      const job = await runJob(queued.id, makeController({ async delete() { throw new Error("injected-delete-failure") } }))
      assert.equal(job.status, "SUCCEEDED")
      const cleanup = await db.mediaAssetCleanup.findUniqueOrThrow({ where: { assetId: oldAsset.id } })
      assert.equal(cleanup.status, "PENDING")
      await cleanupMediaAssetCleanup(cleanup.id, store, db)
      assert.equal((await db.mediaAssetCleanup.findUniqueOrThrow({ where: { id: cleanup.id } })).status, "COMPLETE")
      for (const { key } of variantsFor(oldAsset.variants)) assert.equal(await realStore.head(key), null)
    })
    await t.test("dos controladores comparten los dos puestos incluso durante S3", async () => {
      const jobs: string[] = []
      for (let index = 0; index < 3; index += 1) jobs.push((await enqueue((await createAchievement()).id)).id)
      let entered = 0
      let release!: () => void
      let bothEntered!: () => void
      const gate = new Promise<void>((resolveGate) => { release = resolveGate })
      const both = new Promise<void>((resolveBoth) => { bothEntered = resolveBoth })
      const blocked: Partial<MediaPublicationStore> = { async put(key, bytes, type) {
        if (++entered === 2) bothEntered()
        await gate
        await store.put(key, bytes, type)
      } }
      const first = makeController(blocked)
      const second = makeController(blocked)
      let timer: NodeJS.Timeout | undefined
      try {
        const claims = await Promise.all([first.tick(), second.tick()])
        assert.equal(claims.reduce((sum, count) => sum + count, 0), 2)
        await Promise.race([both, new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("los dos publicadores no llegaron a S3")), 15_000)
        })])
        assert.equal(await db.mediaJob.count({ where: { id: { in: jobs }, status: "PUBLISHING" } }), 2)
        assert.equal(await db.mediaJob.count({ where: { id: { in: jobs }, status: "QUEUED" } }), 1)
        assert.equal(await first.tick(), 0)
        assert.equal(await second.tick(), 0)
      } finally {
        if (timer) clearTimeout(timer)
        release()
        await Promise.all([first.idle(), second.idle()])
      }
      assert.equal(await first.tick(), 1)
      await first.idle()
      assert.equal(await db.mediaJob.count({ where: { id: { in: jobs }, status: "SUCCEEDED" } }), 3)
    })
    for (const mode of ["before", "after"] as const) {
      await t.test(`fallo de acuse ${mode === "before" ? "antes" : "después"} del commit final no destruye objetos`, async () => {
        const oldAsset = await assetFor(existingAchievementId)
        const queued = await enqueue(existingAchievementId)
        let intercepted = false
        // 📚 Proxy mantiene consultas/commits reales; solo pierde la confirmación
        // 📚 en el límite elegido para reproducir la incertidumbre de persistencia.
        const faultyDb = new Proxy(db, {
          get(target, property) {
            if (property === "$transaction") return async (callback: unknown, ...rest: unknown[]) => {
              if (typeof callback !== "function") return Reflect.apply(target.$transaction, target, [callback, ...rest])
              let final = false
              const result = await Reflect.apply(target.$transaction, target, [async (tx: Prisma.TransactionClient) => {
                const txProxy = new Proxy(tx, {
                  get(transaction, field) {
                    if (field === "mediaJob") return new Proxy(transaction.mediaJob, {
                      get(delegate, method) {
                        if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
                          const value = await delegate.updateMany(args)
                          if (args.data.status === "SUCCEEDED") final = true
                          return value
                        }
                        const value = Reflect.get(delegate, method, delegate)
                        return typeof value === "function" ? value.bind(delegate) : value
                      },
                    })
                    const value = Reflect.get(transaction, field, transaction)
                    return typeof value === "function" ? value.bind(transaction) : value
                  },
                })
                const value = await callback(txProxy)
                if (final && mode === "before") { intercepted = true; throw new Error("injected-before-final-commit") }
                return value
              }, ...rest])
              if (final && mode === "after") { intercepted = true; throw new Error("injected-lost-final-ack") }
              return result
            }
            const value = Reflect.get(target, property, target)
            return typeof value === "function" ? value.bind(target) : value
          },
        }) as PrismaClient
        const job = await runJob(queued.id, makeController({}, faultyDb))
        assert.equal(intercepted, true)
        const staged = await db.mediaAsset.findUniqueOrThrow({ where: { jobId: queued.id } })
        for (const variant of variantsFor(staged.variants)) assert.ok(await realStore.head(variant.key))
        if (mode === "before") {
          assert.equal(job.status, "PUBLISHING")
          assert.ok(job.processingSlot)
          assert.equal(staged.state, "STAGING")
          assert.equal((await assetFor(existingAchievementId)).id, oldAsset.id)
          assert.ok((await lstat(join(root, queued.id))).isDirectory())
          // Solo teardown de la fixture: no es reconciliación automática de producto.
          await db.mediaJob.update({ where: { id: queued.id }, data: {
            status: "FAILED", processingSlot: null, activeResourceKey: null, completedAt: new Date(), failureCode: "TEST_TEARDOWN",
          } })
        } else {
          assert.equal(job.status, "SUCCEEDED")
          assert.equal(staged.state, "READY")
          assert.equal((await assetFor(existingAchievementId)).id, staged.id)
          const cleanup = await db.mediaAssetCleanup.findUniqueOrThrow({ where: { assetId: oldAsset.id } })
          await cleanupMediaAssetCleanup(cleanup.id, store, db)
        }
      })
    }
  } finally {
    await Promise.all(controllers.map((controller) => controller.stop()))
    // 📚 Solo se retiran claves registradas por los PUT de esta ejecución, nunca el bucket.
    for (const key of allKeys) {
      await realStore.delete(key)
      assert.equal(await realStore.head(key), null)
    }
    await db.logro.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: fixture.team.id } } })
    await db.mediaAsset.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaJob.deleteMany({ where: { ownerId: fixture.owner.id } })
    await db.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
    await db.team.deleteMany({ where: { id: { in: [fixture.team.id, fixture.otherTeam.id] } } })
    await db.user.deleteMany({ where: { id: { in: [fixture.owner.id, fixture.player.id] } } })
    assert.equal(dirname(root), tempBase)
    assert.ok(root.startsWith(join(tempBase, "media-pipeline-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    realStore.destroy()
    await db.$disconnect()
  }
})
