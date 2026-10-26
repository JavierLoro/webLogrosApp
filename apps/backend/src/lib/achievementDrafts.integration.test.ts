import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdtemp, realpath, rm } from "node:fs/promises"
import { createServer, request, Server } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import cookieParser from "cookie-parser"
import express from "express"
import jwt from "jsonwebtoken"
import sharp from "sharp"
import { mediaAllowedOriginsFromProcess } from "../config/mediaEnv"
import { DATABASE_URL, JWT_SECRET } from "../config/env"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import { errorHandler } from "../middleware/errorHandler"
import equiposRouter from "../routes/equipos"
import { globalDraftsRouter } from "../routes/drafts"
import prisma from "./prisma"
import { startMediaRuntimeFromEnv, MediaRuntime } from "./mediaRuntime"
import { ObjectStore } from "./objectStore"
import { discardDraft, submitDraft } from "./achievementDrafts"
import { imageReferenceCount, imageTargetKey } from "./mediaTargets"
import { cleanupMediaAssetCleanup } from "./mediaAssetCleanup"
import { mediaAssetVariantSchema } from "./mediaPublication"

// 📚 HTTP real + PostgreSQL + Sharp hijo + S3 prueban el contrato completo; gates y fallos inyectados hacen reproducibles las carreras.
test("borradores → imagen → propuesta/publicación → revisión", { skip: process.env.MEDIA_DRAFT_TEST !== "1", timeout: 240_000 }, async t => {
  const url = new URL(DATABASE_URL)
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55437"); assert.equal(url.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv()
  assert.equal(new URL(config.endpoint).hostname, "127.0.0.1"); assert.equal(new URL(config.endpoint).port, "8333"); assert.equal(config.bucket, "lockerboard-media-dev")
  const db = prisma
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), members: await db.teamMembership.count(), logros: await db.logro.count(), proposals: await db.propuestaLogro.count(), drafts: await db.achievementDraft.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(), cleanups: await db.mediaAssetCleanup.count(), owners: await db.mediaRuntimeOwner.count() })
  const before = await counts()
  assert.equal(await db.mediaJob.count({ where: { activeResourceKey: { not: null } } }), 0)
  const run = randomUUID()
  const users = await Promise.all(["admin", "player", "other"].map(name => db.user.create({ data: { email: `draft-${name}-${run}@example.invalid`, password: "test-no-login" } })))
  const [admin, player, other] = users
  const teams = await Promise.all(["a", "b"].map(name => db.team.create({ data: { slug: `draft-${name}-${run}`, nombre: `Draft fixture ${name}` } })))
  const [team, teamB] = teams
  const teamIds = teams.map(x => x.id), userIds = users.map(x => x.id)
  await db.teamMembership.createMany({ data: teams.flatMap(team => users.map(user => ({ userId: user.id, teamId: team.id, role: user.id === admin.id ? "TEAM_ADMIN" as const : "PLAYER" as const }))) })
  const baseTemp = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(baseTemp, "media-drafts-test-")))
  process.env.MEDIA_ENABLED = "true"; process.env.MEDIA_TEMP_ROOT = root; process.env.MEDIA_ALLOWED_ORIGINS = "http://localhost:3000"
  const verifier = new ObjectStore(config)
  let runtime: MediaRuntime | null = null, server: Server | undefined
  let base = "", putCount = 0
  const allKeys = new Set<string>()
  let gate: { entered: Promise<void>; release: () => void; hold: () => Promise<void> } | null = null
  const makeGate = () => {
    let enter!: () => void, release!: () => void
    const entered = new Promise<void>(r => { enter = r }), held = new Promise<void>(r => { release = r })
    return { entered, release, async hold() { enter(); await held } }
  }
  const cookie = (id: number) => `auth_token=${jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "10m" })}`
  const api = (path: string, target = team) => `/equipos/${target.slug}${path}`
  const call = async (path: string, method = "GET", body?: unknown, user = player.id, origin = "http://localhost:3000") => {
    const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie(user), Origin: origin, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    const data = await response.json() as any
    return { status: response.status, data, headers: response.headers }
  }
  const fields = { nombre: "Original proposal", descripcion: "Description", criterios: ["Criterion"] }
  const direct = { ...fields, puntos: 11 }
  const create = async (purpose = "PROPOSAL", value: object = fields, user = player.id, target = team) => {
    const response = await call(api("/borradores", target), "POST", { purpose, fields: value }, user)
    assert.equal(response.status, 201, JSON.stringify(response.data)); return response.data
  }
  const row = (id: string) => db.achievementDraft.findUniqueOrThrow({ where: { id } })
  const discard = async (id: string, user = player.id, target = team) => {
    const r = await row(id); const response = await call(api(`/borradores/${id}/descartar`, target), "POST", { version: r.version }, user)
    assert.equal(response.status, 200, JSON.stringify(response.data))
  }
  const png = await sharp({ create: { width: 800, height: 600, channels: 4, background: "#7755aa80" } }).png().toBuffer()
  const upload = async (path: string, user = player.id, bytes: Uint8Array = png) => {
    const form = new FormData(); form.set("image", new Blob([new Uint8Array(bytes)], { type: "image/png" }), "client.png")
    const response = await fetch(`${base}${path}`, { method: "POST", headers: { Cookie: cookie(user), Origin: "http://localhost:3000" }, body: form })
    const data = await response.json() as any
    assert.equal(response.status, 202, JSON.stringify(data)); return data.job.id as string
  }
  const waitJob = async (id: string, expected = "SUCCEEDED") => {
    for (let i = 0; i < 240; i++) {
      const job = await db.mediaJob.findUniqueOrThrow({ where: { id } })
      if (!["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"].includes(job.status)) { assert.equal(job.status, expected, job.failureCode ?? ""); return job }
      await delay(25)
    }
    throw new Error("Job did not finish")
  }
  const imageDraft = async (user = player.id, target = team, purpose = "PROPOSAL", value: object = fields) => {
    const d = await create(purpose, value, user, target)
    await waitJob(await upload(api(`/borradores/${d.id}/imagen`, target), user))
    return row(d.id)
  }
  const send = (draft: { id: string; version: number }, user = player.id, target = team, purpose = "PROPOSAL") => call(api(purpose === "DIRECT" ? "/logros" : "/propuestas", target), "POST", { borradorId: draft.id, version: draft.version }, user)
  const readImage = async (path: string, user = player.id, etag?: string) => {
    const response = await fetch(`${base}${path}`, { headers: { Cookie: cookie(user), ...(etag ? { "If-None-Match": etag } : {}) } })
    await response.arrayBuffer(); return response
  }
  const variants = async (assetId: string) => mediaAssetVariantSchema.array().parse((await db.mediaAsset.findUniqueOrThrow({ where: { id: assetId } })).variants)
  try {
    runtime = await startMediaRuntimeFromEnv()
    assert.ok(runtime)
    const put = runtime.store.put.bind(runtime.store)
    runtime.store.put = async (key, bytes, type) => { putCount++; allKeys.add(key); await put(key, bytes, type); if (gate) { const current = gate; gate = null; await current.hold() } }
    const app = express(); app.use(express.json()); app.use(cookieParser()); app.use(globalDraftsRouter); app.use("/equipos/:slug", equiposRouter); app.use(errorHandler)
    server = createServer(app); await new Promise<void>(resolve => server!.listen(0, "127.0.0.1", resolve))
    const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://127.0.0.1:${address.port}`

    await t.test("origen configurado también protege borradores con procesamiento desactivado", async () => {
      assert.deepEqual(mediaAllowedOriginsFromProcess({ MEDIA_ENABLED: "false", MEDIA_ALLOWED_ORIGINS: "https://app.example.invalid" }), ["https://app.example.invalid"])
      assert.throws(() => mediaAllowedOriginsFromProcess({ NODE_ENV: "production" }), /obligatorio/)
      assert.throws(() => mediaAllowedOriginsFromProcess({ MEDIA_ALLOWED_ORIGINS: "https://app.example.invalid/path" }), /no válido/)
    })
    await t.test("sesión, origen, cuerpos antiguos y campos manipulados se rechazan", async () => {
      assert.equal((await fetch(`${base}/borradores`)).status, 401)
      for (const path of ["/propuestas", "/logros"]) assert.equal((await call(api(path), "POST", direct, admin.id)).status, 400)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "PROPOSAL" }, player.id, "https://evil.invalid")).status, 403)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "PROPOSAL", ownerId: other.id })).status, 400)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "PROPOSAL", imageAssetId: randomUUID() })).status, 400)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "PROPOSAL", fields: { nombre: "x".repeat(121) } })).status, 400)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "PROPOSAL", fields: { puntos: 20 } })).status, 400)
      assert.equal((await call(api("/borradores"), "POST", { purpose: "DIRECT" })).status, 403)
    })
    await t.test("cuota global de tres serializa carreras entre equipos y conserva incompletos", async () => {
      const results = await Promise.all(Array.from({ length: 8 }, (_, i) => call(api("/borradores", i % 2 ? teamB : team), "POST", { purpose: "PROPOSAL", fields: { nombre: "", criterios: [""] } })))
      assert.equal(results.filter(r => r.status === 201).length, 3); assert.equal(results.filter(r => r.status === 409).length, 5)
      const own = await db.achievementDraft.findMany({ where: { userId: player.id, status: "DRAFT" } }); assert.equal(own.length, 3)
      const independent = await create("PROPOSAL", {}, other.id); await discard(independent.id, other.id)
      for (const d of own) await discard(d.id, player.id, d.teamId === team.id ? team : teamB)
      assert.equal((await call("/borradores")).data.totalOcupado, 0)
    })
    await t.test("autor, tenant, versión obsoleta y pérdida de rol directo", async () => {
      const d = await create("PROPOSAL", {})
      assert.equal((await call(api(`/borradores/${d.id}`), "GET", undefined, other.id)).status, 404)
      assert.equal((await call(api(`/borradores/${d.id}`, teamB))).status, 404)
      assert.equal((await call(api(`/borradores/${d.id}`), "PATCH", { version: 1, fields: { nombre: "" } })).status, 200)
      assert.equal((await call(api(`/borradores/${d.id}`), "PATCH", { version: 1, fields })).status, 409)
      assert.equal((await call(api(`/borradores/${d.id}`), "PATCH", { version: 2, purpose: "DIRECT", fields })).status, 400)
      await discard(d.id)
      const a = await create("DIRECT", {}, admin.id)
      await db.teamMembership.update({ where: { userId_teamId: { userId: admin.id, teamId: team.id } }, data: { role: "PLAYER" } })
      assert.equal((await send(a, admin.id, team, "DIRECT")).status, 403)
      await discard(a.id, admin.id)
      await db.teamMembership.update({ where: { userId_teamId: { userId: admin.id, teamId: team.id } }, data: { role: "TEAM_ADMIN" } })
    })
    await t.test("membresía perdida oculta datos pero sigue consumiendo plaza; reingreso recupera", async () => {
      const d = await imageDraft()
      const assetId = d.imageAssetId
      await db.teamMembership.delete({ where: { userId_teamId: { userId: player.id, teamId: team.id } } })
      const overview = (await call("/borradores")).data
      assert.equal(overview.totalOcupado, 1); assert.equal(overview.inaccesibles, 1); assert.deepEqual(overview.borradores, [])
      for (const suffix of ["", "/imagen"]) assert.equal((await readImage(api(`/borradores/${d.id}${suffix}`))).status, 403)
      assert.equal((await call(api(`/borradores/${d.id}/descartar`), "POST", { version: d.version })).status, 403)
      await create("PROPOSAL", {}, player.id, teamB); await create("PROPOSAL", {}, player.id, teamB)
      assert.equal((await call(api("/borradores", teamB), "POST", { purpose: "PROPOSAL" })).status, 409)
      await db.teamMembership.create({ data: { userId: player.id, teamId: team.id } })
      assert.equal((await row(d.id)).imageAssetId, assetId)
      assert.equal((await call("/borradores")).data.inaccesibles, 0)
      for (const item of await db.achievementDraft.findMany({ where: { userId: player.id, status: "DRAFT" } })) await discard(item.id, player.id, item.teamId === team.id ? team : teamB)
    })
    await t.test("imagen obligatoria, campos completos y finalidad antes de enviar", async () => {
      const d = await create("PROPOSAL", {})
      assert.equal((await send(d)).status, 409)
      await waitJob(await upload(api(`/borradores/${d.id}/imagen`)))
      const ready = await row(d.id); assert.equal(ready.version, 2)
      assert.equal((await send(d)).status, 409)
      assert.equal((await send(ready)).status, 400)
      assert.equal((await send(ready, player.id, team, "DIRECT")).status, 403)
      assert.equal((await readImage(api(`/borradores/${d.id}/imagen`), admin.id)).status, 404)
      await discard(d.id)
    })
    await t.test("sustitución activa bloquea envío aunque haya imagen READY; cancelación conserva anterior", async () => {
      const d = await imageDraft(); const old = d.imageAssetId
      const held = makeGate(); gate = held
      const jobId = await upload(api(`/borradores/${d.id.toUpperCase()}/imagen`)); await held.entered
      try {
        assert.equal((await send(d)).status, 409)
        const cancel = await call(api(`/media/trabajos/${jobId}/cancelar`), "POST", {})
        assert.equal(cancel.status, 202)
        assert.equal((await call(api(`/media/trabajos/${jobId}`))).status, 200)
      } finally { held.release() }
      await waitJob(jobId, "CANCELED")
      assert.equal((await row(d.id)).imageAssetId, old)
      await discard(d.id)
    })
    await t.test("fallo de imagen y objeto ausente no permiten enviar ni liberan plaza", async () => {
      const d = await create()
      await waitJob(await upload(api(`/borradores/${d.id}/imagen`), player.id, png.subarray(0, 32)), "FAILED")
      assert.equal((await send(d)).status, 409)
      await waitJob(await upload(api(`/borradores/${d.id}/imagen`)))
      const ready = await row(d.id); const v = await variants(ready.imageAssetId!)
      await verifier.delete(v[0].key)
      assert.equal((await send(ready)).status, 409)
      assert.equal((await row(d.id)).status, "DRAFT")
      await discard(d.id)
    })
    let acceptedId = 0, rejectedId = 0
    await t.test("doble envío y reintento perdido devuelven un único resultado y liberan una plaza", async () => {
      const d = await imageDraft()
      const result = await Promise.all([send(d), send(d)])
      assert.deepEqual(result.map(r => r.status), [201, 201]); assert.equal(result[0].data.id, result[1].data.id)
      acceptedId = result[0].data.id
      assert.equal((await row(d.id)).imageAssetId, null)
      assert.equal(await db.propuestaLogro.count({ where: { userId: player.id, teamId: team.id } }), 1)
      assert.equal((await call("/borradores")).data.totalOcupado, 0)
      assert.equal((await send(d)).data.id, acceptedId)
      assert.deepEqual((await call(api(`/borradores/${d.id}`))).data.fields, {})
      assert.equal((await send({ ...d, version: d.version + 1 })).status, 409)
      assert.equal((await uploadDenied(api(`/propuestas/${acceptedId}/imagen`))), 409)
      assert.equal((await readImage(api(`/propuestas/${acceptedId}/imagen`))).status, 200)
      await db.teamMembership.delete({ where: { userId_teamId: { userId: player.id, teamId: team.id } } })
      assert.equal((await send(d)).status, 403)
      await db.teamMembership.create({ data: { userId: player.id, teamId: team.id } })
    })
    await t.test("aprobar transfiere referencia sin PUT; historial resuelve catálogo vigente y respeta secreto", async () => {
      const beforePut = putCount
      const p = await db.propuestaLogro.findUniqueOrThrow({ where: { id: acceptedId } }); const image = p.imageAssetId
      assert.equal((await call(api(`/admin/propuestas/${acceptedId}/aceptar`), "POST", { puntos: 30 })).status, 403)
      const results = await Promise.all([0, 1].map(() => call(api(`/admin/propuestas/${acceptedId}/aceptar`), "POST", { puntos: 30, isSecret: true }, admin.id)))
      assert.deepEqual(results.map(r => r.status).sort(), [200, 409]); assert.equal(putCount, beforePut)
      const accepted = await db.propuestaLogro.findUniqueOrThrow({ where: { id: acceptedId }, include: { logro: true } })
      assert.equal(accepted.imageAssetId, null); assert.equal(accepted.logro!.imageAssetId, image)
      assert.equal((await readImage(api(`/propuestas/${acceptedId}/imagen`))).status, 404)
      assert.equal((await call(api(`/propuestas/${acceptedId}`))).data.isHidden, true)
      const original = await readImage(api(`/propuestas/${acceptedId}/imagen`), admin.id); assert.equal(original.status, 200)
      const etag = original.headers.get("etag")!
      await waitJob(await upload(api(`/logros/${accepted.logroId}/imagen`), admin.id))
      const current = await readImage(api(`/propuestas/${acceptedId}/imagen`), admin.id, etag); assert.equal(current.status, 200); assert.notEqual(current.headers.get("etag"), etag)
      const cleanup = await db.mediaAssetCleanup.findUniqueOrThrow({ where: { assetId: image! } }); await cleanupMediaAssetCleanup(cleanup.id, verifier)
      for (const v of await variants(image!)) assert.equal(await verifier.head(v.key), null)
    })
    await t.test("rechazar conserva exactamente su imagen y prohíbe sustitución", async () => {
      const d = await imageDraft(); const submitted = await send(d); rejectedId = submitted.data.id
      const beforePut = putCount
      const result = await call(api(`/admin/propuestas/${rejectedId}/rechazar`), "POST", { reason: "No cumple el criterio" }, admin.id)
      assert.equal(result.status, 200); assert.equal(result.data.imageAssetId, d.imageAssetId); assert.equal(putCount, beforePut)
      assert.equal((await readImage(api(`/propuestas/${rejectedId}/imagen`))).status, 200)
      assert.equal(await uploadDenied(api(`/propuestas/${rejectedId}/imagen`)), 409)
      assert.equal((await call(api(`/admin/propuestas/${rejectedId}/aceptar`), "POST", { puntos: 1 }, admin.id)).status, 409)
    })
    await t.test("publicación directa con imagen, finalidad inmutable y reintento idempotente", async () => {
      const d = await imageDraft(admin.id, team, "DIRECT", direct)
      assert.equal((await send(d, admin.id)).status, 409)
      const result = await Promise.all([send(d, admin.id, team, "DIRECT"), send(d, admin.id, team, "DIRECT")])
      assert.deepEqual(result.map(r => r.status), [201, 201]); assert.equal(result[0].data.id, result[1].data.id)
      assert.equal(result[0].data.imageAssetId, d.imageAssetId); assert.equal((await row(d.id)).status, "PUBLISHED")
      assert.equal((await readImage(api(`/logros/${result[0].data.id}/imagen`))).status, 200)
    })
    await t.test("sexta pendiente conserva borrador/imagen; otros jugadores y equipos tienen contador independiente", async () => {
      await db.propuestaLogro.createMany({ data: Array.from({ length: 5 }, () => ({ userId: player.id, teamId: team.id, ...fields })) })
      const d = await imageDraft()
      assert.equal((await send(d)).status, 409); assert.equal((await row(d.id)).imageAssetId, d.imageAssetId); assert.equal((await row(d.id)).status, "DRAFT")
      const independent = await imageDraft(other.id); assert.equal((await send(independent, other.id)).status, 201)
      const differentTeam = await imageDraft(player.id, teamB); assert.equal((await send(differentTeam, player.id, teamB)).status, 201)
      const pending = await db.propuestaLogro.findFirstOrThrow({ where: { teamId: team.id, userId: player.id, status: "PENDING" } })
      assert.equal((await call(api(`/admin/propuestas/${pending.id}/rechazar`), "POST", { reason: "Liberar plaza" }, admin.id)).status, 200)
      const racing = await imageDraft(); const results = await Promise.all([send(d), send(racing)])
      assert.deepEqual(results.map(r => r.status).sort(), [201, 409])
      assert.equal(await db.propuestaLogro.count({ where: { teamId: team.id, userId: player.id, status: "PENDING" } }), 5)
      for (const candidate of [d, racing]) if ((await row(candidate.id)).status === "DRAFT") await discard(candidate.id)
    })
    await t.test("rollback transaccional y pérdida de ACK preservan la semántica del envío", async () => {
      const d = await imageDraft(other.id, teamB)
      const faulty = new Proxy(db, { get(target, property) {
        if (property === "$transaction") return async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => target.$transaction(async tx => callback(new Proxy(tx, { get(transaction, prop) {
          if (prop === "propuestaLogro") return new Proxy(transaction.propuestaLogro, { get(delegate, method) { if (method === "create") return () => { throw new Error("injected transaction failure") }; return Reflect.get(delegate, method, delegate) } })
          return Reflect.get(transaction, prop, transaction)
        } })))
        return Reflect.get(target, property, target)
      } }) as PrismaClient
      await assert.rejects(submitDraft(other.id, teamB.id, d.id, d.version, "PROPOSAL", verifier, faulty))
      assert.equal((await row(d.id)).status, "DRAFT"); assert.equal((await row(d.id)).imageAssetId, d.imageAssetId)
      const discardFault = new Proxy(db, { get(target, prop) {
        if (prop === "$transaction") return (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) => target.$transaction(async tx => { await callback(tx); throw new Error("discard rollback") })
        return Reflect.get(target, prop, target)
      } }) as PrismaClient
      await assert.rejects(discardDraft(other.id, teamB.id, d.id, d.version, discardFault))
      assert.equal((await row(d.id)).status, "DRAFT"); assert.equal((await row(d.id)).imageAssetId, d.imageAssetId)
      const ackLost = new Proxy(db, { get(target, prop) { if (prop === "$transaction") return async (...args: unknown[]) => { await Reflect.apply(target.$transaction, target, args); throw new Error("lost response after commit") }; return Reflect.get(target, prop, target) } }) as PrismaClient
      await assert.rejects(submitDraft(other.id, teamB.id, d.id, d.version, "PROPOSAL", verifier, ackLost))
      const retry = await send(d, other.id, teamB); assert.equal(retry.status, 201); assert.equal(retry.data.id, (await row(d.id)).resultId)
    })
    await t.test("legacy subsanable: solo autor, sin editar texto ni sustituir; aprobación espera trabajo y READY", async () => {
      const p = await db.propuestaLogro.create({ data: { teamId: team.id, userId: other.id, ...fields, imageRepairAllowed: true } })
      assert.equal((await call(api(`/admin/propuestas/${p.id}/aceptar`), "POST", { puntos: 1 }, admin.id)).status, 409)
      assert.equal(await uploadDenied(api(`/propuestas/${p.id}/imagen`), player.id), 404)
      const held = makeGate(); gate = held
      const job = await upload(api(`/propuestas/${p.id}/imagen`), other.id); await held.entered
      try { assert.equal((await call(api(`/admin/propuestas/${p.id}/aceptar`), "POST", { puntos: 1 }, admin.id)).status, 409) } finally { held.release() }
      await waitJob(job)
      const repaired = await db.propuestaLogro.findUniqueOrThrow({ where: { id: p.id } })
      assert.equal(repaired.imageRepairAllowed, false); assert.equal(repaired.nombre, fields.nombre); assert.deepEqual(repaired.criterios, fields.criterios)
      assert.equal(await uploadDenied(api(`/propuestas/${p.id}/imagen`), other.id), 409)
      const imageVariants = await variants(repaired.imageAssetId!)
      const saved = await verifier.get(imageVariants[0].key); assert.ok(saved)
      const chunks: Buffer[] = []; for await (const bytes of saved.body) chunks.push(Buffer.from(bytes))
      await verifier.delete(imageVariants[0].key)
      assert.equal((await call(api(`/admin/propuestas/${p.id}/aceptar`), "POST", { puntos: 1 }, admin.id)).status, 409)
      assert.equal((await db.propuestaLogro.findUniqueOrThrow({ where: { id: p.id } })).status, "PENDING")
      await verifier.put(imageVariants[0].key, Buffer.concat(chunks), "image/png")
      assert.equal((await call(api(`/admin/propuestas/${p.id}/aceptar`), "POST", { puntos: 1 }, admin.id)).status, 200)
    })
    await t.test("descarte durante publicación libera plaza y un PUT tardío nunca vuelve a asociar", async () => {
      const d = await imageDraft(other.id)
      const held = makeGate(); gate = held
      const job = await upload(api(`/borradores/${d.id}/imagen`), other.id); await held.entered
      try {
        await discard(d.id, other.id)
        assert.equal((await row(d.id)).imageAssetId, null)
        const next = await create("PROPOSAL", {}, other.id); await discard(next.id, other.id)
      } finally { held.release() }
      await waitJob(job, "CANCELED")
      assert.equal((await row(d.id)).status, "DISCARDED")
      assert.equal((await row(d.id)).imageAssetId, null)
      await discard(d.id, other.id)
    })
    await t.test("descarte de QUEUED confirma cancelación y libera destino inmediatamente", async () => {
      const claims = require("./mediaJobClaims") as typeof import("./mediaJobClaims")
      const claim = claims.claimNextQueuedMediaJob
      claims.claimNextQueuedMediaJob = async () => null
      const d = await create("PROPOSAL", {}, other.id)
      try {
        const job = await upload(api(`/borradores/${d.id}/imagen`), other.id)
        assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: job } })).status, "QUEUED")
        await discard(d.id, other.id)
        await waitJob(job, "CANCELED")
        assert.equal((await db.mediaJob.findUniqueOrThrow({ where: { id: job } })).activeResourceKey, null)
      } finally { claims.claimNextQueuedMediaJob = claim }
    })
    await t.test("descarte durante RECEIVING aborta el stream antes de liberar su reserva", async () => {
      const d = await create("PROPOSAL", {}, other.id)
      const req = request(`${base}${api(`/borradores/${d.id}/imagen`)}`, { method: "POST", headers: { Cookie: cookie(other.id), Origin: "http://localhost:3000", "Content-Type": "multipart/form-data; boundary=draft-held" } })
      req.on("error", () => {})
      const response = new Promise<void>(resolve => { req.on("response", res => { res.resume(); res.on("end", resolve) }); req.on("error", () => resolve()) })
      req.write(Buffer.from('--draft-held\r\nContent-Disposition: form-data; name="image"; filename="x.png"\r\nContent-Type: image/png\r\n\r\n'))
      req.write(png.subarray(0, 32))
      let jobId = ""
      try {
        for (let i = 0; i < 120; i++) {
          const job = await db.mediaJob.findFirst({ where: { activeResourceKey: imageTargetKey({ kind: "draft", teamId: team.id, id: d.id }), receiptToken: { not: null } } })
          if (job) { jobId = job.id; break }; await delay(25)
        }
        assert.ok(jobId)
        await discard(d.id, other.id)
        await waitJob(jobId, "CANCELED")
        assert.equal((await row(d.id)).status, "DISCARDED")
        await response
      } finally { req.destroy() }
    })
    await t.test("limpieza respeta referencias de borrador y propuesta y claves conservan origen", async () => {
      const d = await imageDraft(other.id)
      assert.equal(await imageReferenceCount(db, d.imageAssetId!), 1)
      await assert.rejects(db.achievementDraft.create({ data: { userId: other.id, teamId: teamB.id, purpose: "PROPOSAL", imageAssetId: d.imageAssetId } }))
      await assert.rejects(db.propuestaLogro.create({ data: { userId: other.id, teamId: teamB.id, ...fields, imageAssetId: d.imageAssetId } }))
      const own = await variants(d.imageAssetId!); assert.ok(own.every(v => v.key.includes(`/drafts/${d.id}/`)))
      const c = await db.mediaAssetCleanup.create({ data: { assetId: d.imageAssetId!, keys: own.map(v => v.key) } })
      await db.mediaAsset.update({ where: { id: d.imageAssetId! }, data: { state: "RETIRED" } })
      await assert.rejects(cleanupMediaAssetCleanup(c.id, verifier), /sigue asociado/)
      await db.mediaAsset.update({ where: { id: d.imageAssetId! }, data: { state: "READY" } }); await db.mediaAssetCleanup.delete({ where: { id: c.id } })
      const proposal = await db.propuestaLogro.findUniqueOrThrow({ where: { id: rejectedId } })
      assert.equal(await imageReferenceCount(db, proposal.imageAssetId!), 1)
      await discard(d.id, other.id)
    })
  } finally {
    (gate as { release: () => void } | null)?.release()
    await runtime?.stop()
    if (server) { server.closeAllConnections(); await new Promise<void>(r => server!.close(() => r())) }
    const assets = await db.mediaAsset.findMany({ where: { teamId: { in: teamIds } } })
    for (const asset of assets) for (const v of mediaAssetVariantSchema.array().parse(asset.variants)) allKeys.add(v.key)
    for (const key of allKeys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
    await db.achievementDraft.deleteMany({ where: { userId: { in: userIds } } })
    await db.propuestaLogro.deleteMany({ where: { teamId: { in: teamIds } } })
    await db.logro.deleteMany({ where: { teamId: { in: teamIds } } })
    await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId: { in: teamIds } } } })
    await db.mediaAsset.deleteMany({ where: { teamId: { in: teamIds } } })
    await db.mediaJob.deleteMany({ where: { ownerId: { in: userIds } } })
    if (runtime) await db.mediaRuntimeOwner.deleteMany({ where: { id: runtime.ownerId } })
    await db.teamMembership.deleteMany({ where: { teamId: { in: teamIds } } })
    await db.team.deleteMany({ where: { id: { in: teamIds } } }); await db.user.deleteMany({ where: { id: { in: userIds } } })
    assert.equal(dirname(root), baseTemp); assert.ok(root.startsWith(join(baseTemp, "media-drafts-test-"))); assert.equal(await realpath(root), root)
    await rm(root, { recursive: true })
    assert.deepEqual(await counts(), before)
    verifier.destroy(); await db.$disconnect()
  }
  async function uploadDenied(path: string, user = player.id) {
    const form = new FormData(); form.set("image", new Blob([new Uint8Array(png)], { type: "image/png" }), "client.png")
    const response = await fetch(`${base}${path}`, { method: "POST", headers: { Cookie: cookie(user), Origin: "http://localhost:3000" }, body: form }); await response.arrayBuffer(); return response.status
  }
})
