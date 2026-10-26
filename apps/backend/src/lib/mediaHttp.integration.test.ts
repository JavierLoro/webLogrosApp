import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdtemp, realpath, rm } from "node:fs/promises"
import { createServer, request, type Server } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { Readable } from "node:stream"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { PrismaClient } from "@prisma/client"
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
import { createMediaRuntime, type MediaRuntime } from "./mediaRuntime"
import { ObjectStore } from "./objectStore"
import prisma from "./prisma"

// 📚 HTTP real permite comprobar que destruir el stream de procesamiento no corta
// 📚 el JSON de error y que las cookies/permisos preceden a cualquier respuesta 304.
test("API media conectada con runtime, permisos y caché privada", {
  skip: process.env.MEDIA_HTTP_TEST !== "1", timeout: 180_000,
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
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), members: await db.teamMembership.count(),
    achievements: await db.logro.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(), cleanup: await db.mediaAssetCleanup.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0)
  const run = randomUUID()
  const fixture = await db.$transaction(async (tx) => {
    const admin = await tx.user.create({ data: { email: `media-http-${run}@example.invalid`, password: "no-login-test" } })
    const player = await tx.user.create({ data: { email: `media-http-player-${run}@example.invalid`, password: "no-login-test" } })
    const outsider = await tx.user.create({ data: { email: `media-http-other-${run}@example.invalid`, password: "no-login-test" } })
    const team = await tx.team.create({ data: { nombre: "HTTP Media Probe", slug: `media-http-${run}` } })
    const otherTeam = await tx.team.create({ data: { nombre: "Other HTTP Probe", slug: `media-http-other-${run}` } })
    await tx.teamMembership.createMany({ data: [
      { userId: admin.id, teamId: team.id, role: "TEAM_ADMIN" }, { userId: player.id, teamId: team.id, role: "PLAYER" },
      { userId: outsider.id, teamId: otherTeam.id, role: "TEAM_ADMIN" },
    ] })
    const logro = await tx.logro.create({ data: { nombre: "HTTP achievement", puntos: 10, teamId: team.id } })
    const secret = await tx.logro.create({ data: { nombre: "HTTP secret", puntos: 10, teamId: team.id, isSecret: true } })
    return { admin, player, outsider, team, otherTeam, logro, secret }
  })
  const keys = new Set<string>()
  const store = new ObjectStore(config)
  const verifier = new ObjectStore(config)
  let destroyed = 0
  let failReadBeforeFirstByte = false
  const tempBase = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(tempBase, "media-http-test-")))
  let runtime: MediaRuntime | null = null
  let server: Server | undefined
  let origin = ""
  const cookieFor = (userId: number) => `auth_token=${jwt.sign({ userId }, JWT_SECRET, { expiresIn: "5m" })}`
  const cookie = cookieFor(fixture.admin.id)
  const api = () => `${origin}/equipos/${fixture.team.slug}`
  const imageUrl = (id = fixture.logro.id) => `${api()}/logros/${id}/imagen`
  const png = await sharp({ create: { width: 1400, height: 900, channels: 4, background: "#11447780" } }).png().toBuffer()
  const form = (bytes: Buffer = png, field = "image") => {
    const data = new FormData()
    data.set(field, new Blob([Uint8Array.from(bytes)], { type: "image/png" }), "image.png")
    return data
  }
  const upload = (id = fixture.logro.id, options: { cookie?: string; origin?: string; bytes?: Buffer; field?: string } = {}) => fetch(imageUrl(id), {
    method: "POST", headers: { Cookie: options.cookie ?? cookie, Origin: options.origin ?? "http://localhost:3000" },
    body: form(options.bytes, options.field),
  })
  const waitForTerminal = async (id: string) => {
    for (let attempt = 0; attempt < 250; attempt++) {
      const response = await fetch(`${api()}/media/trabajos/${id}`, { headers: { Cookie: cookie } })
      assert.equal(response.status, 200)
      const job = await response.json() as { id: string; status: string }
      if (["SUCCEEDED", "FAILED", "CANCELED"].includes(job.status)) return job
      await delay(20)
    }
    throw new Error("El runtime no terminó el trabajo HTTP en 5s")
  }
  let firstJobId = ""
  let firstEtag = ""
  try {
    runtime = await createMediaRuntime({ temporaryRoot: root, db, pollIntervalMs: 100,
      allowedOrigins: ["http://localhost:3000"], store: {
        async put(key, bytes, type) { keys.add(key); await store.put(key, bytes, type) },
        async get(key) {
          const object = await store.get(key)
          if (!object || !failReadBeforeFirstByte) return object
          object.body.destroy()
          return { ...object, body: Readable.from((async function* () {
            throw new Error("injected-read-error-before-first-byte")
            yield Buffer.alloc(0)
          })()) }
        },
        head: store.head.bind(store), delete: store.delete.bind(store),
        destroy() { destroyed++; store.destroy() },
      } })
    const app = express()
    app.use(express.json())
    app.use(cookieParser())
    app.use("/equipos/:slug", resolveTeam, createMediaRouter({ db, getRuntime: () => runtime }))
    app.use(errorHandler)
    server = createServer(app)
    await new Promise<void>((resolveListening) => server!.listen(0, "127.0.0.1", resolveListening))
    const address = server.address()
    assert.ok(address && typeof address !== "string")
    origin = `http://127.0.0.1:${address.port}`
    await t.test("POST 202 dispara la cola sin tick manual y el DTO no filtra rutas", async () => {
      const response = await upload()
      assert.equal(response.status, 202)
      assert.match(response.headers.get("cache-control") ?? "", /no-store/)
      const result = await response.json() as { job: { id: string; status: string } }
      firstJobId = result.job.id
      const text = JSON.stringify(result)
      assert.equal(text.includes(root), false)
      assert.equal(text.includes("resourceKey"), false)
      assert.equal(text.includes("executionToken"), false)
      assert.equal((await waitForTerminal(firstJobId)).status, "SUCCEEDED")
    })
    await t.test("miembro lee variante privada y revalida por ETag", async () => {
      const response = await fetch(`${imageUrl()}?size=320`, { headers: { Cookie: cookieFor(fixture.player.id) } })
      assert.equal(response.status, 200)
      assert.equal(response.headers.get("content-type"), "image/png")
      assert.match(response.headers.get("cache-control") ?? "", /private/)
      assert.match(response.headers.get("cache-control") ?? "", /no-cache/)
      assert.match(response.headers.get("vary") ?? "", /Cookie/i)
      firstEtag = response.headers.get("etag")!
      assert.ok(firstEtag)
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata()
      assert.equal(metadata.width, 320)
      assert.equal(metadata.exif, undefined)
      const cached = await fetch(`${imageUrl()}?size=320`, { headers: { Cookie: cookie, "If-None-Match": firstEtag } })
      assert.equal(cached.status, 304)
      assert.equal((await cached.arrayBuffer()).byteLength, 0)
    })
    await t.test("sin sesión, caducada o fuera del equipo no devuelve 304", async () => {
      for (const [credential, expected] of [
        ["", 401], [`auth_token=${jwt.sign({ userId: fixture.admin.id }, JWT_SECRET, { expiresIn: -1 })}`, 401],
        [cookieFor(fixture.outsider.id), 403],
      ] as const) {
        const response = await fetch(`${imageUrl()}?size=320`, { headers: { Cookie: credential, "If-None-Match": firstEtag } })
        assert.equal(response.status, expected)
        assert.match(response.headers.get("cache-control") ?? "", /no-store/)
        assert.ok((await response.json() as { error: string }).error)
      }
    })
    await t.test("fallo de lectura previo al primer byte devuelve JSON 503 sin cabeceras de imagen", async () => {
      failReadBeforeFirstByte = true
      try {
        const response = await fetch(imageUrl(), { headers: { Cookie: cookie } })
        assert.equal(response.status, 503)
        assert.match(response.headers.get("content-type") ?? "", /application\/json/)
        assert.match(response.headers.get("cache-control") ?? "", /no-store/)
        assert.ok((await response.json() as { error: string }).error)
      } finally { failReadBeforeFirstByte = false }
    })
    await t.test("POST rechaza PLAYER/origen ajeno sin reservar trabajos", async () => {
      const count = await db.mediaJob.count()
      for (const opts of [{ cookie: cookieFor(fixture.player.id) }, { origin: "https://untrusted.invalid" }]) {
        const response = await upload(fixture.logro.id, opts)
        assert.equal(response.status, 403)
        assert.ok((await response.json() as { error: string }).error)
      }
      assert.equal(await db.mediaJob.count(), count)
    })
    await t.test("estado scoped: propietario, equipo y UUID", async () => {
      const other = await fetch(`${api()}/media/trabajos/${firstJobId}`, { headers: { Cookie: cookieFor(fixture.player.id) } })
      assert.equal(other.status, 404)
      await other.arrayBuffer()
      const wrongTeam = await fetch(`${origin}/equipos/${fixture.otherTeam.slug}/media/trabajos/${firstJobId}`, { headers: { Cookie: cookieFor(fixture.outsider.id) } })
      assert.equal(wrongTeam.status, 404)
      await wrongTeam.arrayBuffer()
      const invalid = await fetch(`${api()}/media/trabajos/invalid`, { headers: { Cookie: cookie } })
      assert.equal(invalid.status, 400)
      await invalid.arrayBuffer()
    })
    await t.test("multipart incorrecto y tamaño excesivo devuelven JSON sin cortar la respuesta", async () => {
      for (const [opts, expected] of [
        [{ field: "foreign" }, 400], [{ bytes: Buffer.concat([png, Buffer.alloc(10_000_001 - png.length)]) }, 413],
      ] as const) {
        const response = await upload(fixture.logro.id, opts)
        assert.equal(response.status, expected)
        assert.ok((await response.json() as { error: string }).error)
      }
    })
    await t.test("reemplazo cambia ETag y elimina la versión vieja sin invalidar la nueva", async () => {
      const response = await upload()
      assert.equal(response.status, 202)
      const result = await response.json() as { job: { id: string } }
      assert.equal((await waitForTerminal(result.job.id)).status, "SUCCEEDED")
      const fresh = await fetch(`${imageUrl()}?size=320`, { headers: { Cookie: cookie, "If-None-Match": firstEtag } })
      assert.equal(fresh.status, 200)
      assert.notEqual(fresh.headers.get("etag"), firstEtag)
      await fresh.arrayBuffer()
    })
    await t.test("secreto no descubierto oculta la imagen al PLAYER", async () => {
      const response = await upload(fixture.secret.id)
      assert.equal(response.status, 202)
      const result = await response.json() as { job: { id: string } }
      assert.equal((await waitForTerminal(result.job.id)).status, "SUCCEEDED")
      const hidden = await fetch(imageUrl(fixture.secret.id), { headers: { Cookie: cookieFor(fixture.player.id) } })
      assert.equal(hidden.status, 404)
      await hidden.arrayBuffer()
      await db.userLogro.create({ data: { userId: fixture.player.id, logroId: fixture.secret.id } })
      const revealed = await fetch(imageUrl(fixture.secret.id), { headers: { Cookie: cookieFor(fixture.player.id) } })
      assert.equal(revealed.status, 200)
      await revealed.arrayBuffer()
    })
    await t.test("desconexión durante body termina recepción sin publicar", async () => {
      const logro = await db.logro.create({ data: { nombre: "Disconnected HTTP", puntos: 1, teamId: fixture.team.id } })
      const boundary = "unfinished-real-http-upload"
      const target = `${api()}/logros/${logro.id}/imagen`
      const req = request(target, { method: "POST", headers: {
        Cookie: cookie, Origin: "http://localhost:3000", "Content-Type": `multipart/form-data; boundary=${boundary}`,
      } })
      req.on("error", () => {})
      req.write(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n`)
      req.write(png.subarray(0, 30))
      let jobId: string | undefined
      try {
        for (let attempt = 0; attempt < 100; attempt++) {
          const job = await db.mediaJob.findFirst({ where: { ownerId: fixture.admin.id, resourceKey: `team:${fixture.team.id}:achievement:${logro.id}:image` } })
          if (job?.receiptToken) { jobId = job.id; break }
          await delay(10)
        }
        assert.ok(jobId)
      } finally { req.destroy() }
      const job = await waitForTerminal(jobId!)
      assert.ok(job.status === "CANCELED" || job.status === "FAILED")
      assert.equal((await db.logro.findUniqueOrThrow({ where: { id: logro.id } })).imageAssetId, null)
    })
    await t.test("desconexión mientras se espera el lease no reserva ni retiene la recepción", async () => {
      const initialJobs = await db.mediaJob.count()
      const acquire = runtime!.acquireReceipt.bind(runtime)
      let entered!: () => void
      let release!: () => void
      let released!: () => void
      const waiting = new Promise<void>((resolveWaiting) => { entered = resolveWaiting })
      const gate = new Promise<void>((resolveGate) => { release = resolveGate })
      const finished = new Promise<void>((resolveFinished) => { released = resolveFinished })
      runtime!.acquireReceipt = async () => {
        const lease = await acquire()
        entered()
        await gate
        return { ...lease, release() { lease.release(); released() } }
      }
      const req = request(imageUrl(), { method: "POST", headers: {
        Cookie: cookie, Origin: "http://localhost:3000", "Content-Type": "multipart/form-data; boundary=early-abort",
      } })
      req.on("error", () => {})
      let timer: NodeJS.Timeout | undefined
      try {
        req.write("--early-abort\r\n")
        await waiting
        req.destroy()
        await delay(20)
        release()
        await Promise.race([finished, new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("el lease desconectado no se liberó")), 2000)
        })])
        assert.equal(await db.mediaJob.count(), initialJobs)
      } finally {
        if (timer) clearTimeout(timer)
        release()
        req.destroy()
        runtime!.acquireReceipt = acquire
      }
    })
    await t.test("stop espera leases y cierra una sola vez el almacén", async () => {
      const lease = await runtime!.acquireReceipt()
      let finishHttp!: () => void
      const httpClosed = new Promise<void>((resolveClosed) => { finishHttp = resolveClosed })
      const stopping = runtime!.stop(() => httpClosed)
      assert.equal(lease.signal.aborted, true)
      assert.equal(runtime!.accepting(), false)
      lease.release()
      await delay(20)
      assert.equal(destroyed, 0, "S3 sigue abierto mientras termina el cierre HTTP")
      finishHttp()
      await stopping
      await runtime!.stop()
      assert.equal(destroyed, 1)
      const response = await upload()
      assert.equal(response.status, 503)
      await response.arrayBuffer()
    })
  } finally {
    await runtime?.stop()
    if (server) await new Promise<void>((resolveClosed) => server!.close(() => resolveClosed()))
    for (const key of keys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
    await db.userLogro.deleteMany({ where: { logro: { teamId: fixture.team.id } } })
    await db.logro.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: fixture.team.id } } })
    await db.mediaAsset.deleteMany({ where: { teamId: fixture.team.id } })
    await db.mediaJob.deleteMany({ where: { ownerId: fixture.admin.id } })
    if (runtime) await db.mediaRuntimeOwner.deleteMany({ where: { id: runtime.ownerId } })
    await db.teamMembership.deleteMany({ where: { teamId: { in: [fixture.team.id, fixture.otherTeam.id] } } })
    await db.team.deleteMany({ where: { id: { in: [fixture.team.id, fixture.otherTeam.id] } } })
    await db.user.deleteMany({ where: { id: { in: [fixture.admin.id, fixture.player.id, fixture.outsider.id] } } })
    assert.equal(dirname(root), tempBase)
    assert.ok(root.startsWith(join(tempBase, "media-http-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    verifier.destroy()
    store.destroy()
    await Promise.all([db.$disconnect(), prisma.$disconnect()])
  }
})
