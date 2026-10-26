import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises"
import { createServer, Server } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import { parseArgs } from "node:util"
import cookieParser from "cookie-parser"
import express from "express"
import jwt from "jsonwebtoken"
import sharp from "sharp"
import { DATABASE_URL, JWT_SECRET } from "../../config/env"
import { objectStoreConfigFromEnv } from "../../config/objectStoreEnv"
import { errorHandler } from "../../middleware/errorHandler"
import equiposRouter from "../../routes/equipos"
import prisma from "../../lib/prisma"
import { ObjectStore } from "../../lib/objectStore"
import { startMediaRuntimeFromEnv, type MediaRuntime } from "../../lib/mediaRuntime"
import { mediaAssetVariantSchema } from "../../lib/mediaPublication"
import { summarizeQuality, type QualityCaseResult } from "./analysis"
import { generateQualityCorpus, publicCorpus, sha256 } from "./corpus"
import { comparePixels, assertOrientedCorners, makeLosslessReference } from "./metrics"
import { makeReviewPanel } from "./review"

// 📚 Los umbrales de aviso se fijan antes del ensayo: requieren inspección, nunca cambian la compresión ni fuerzan un PASS.
const JPEG_REVIEW_THRESHOLDS = { psnrDb: 30, ssimLuma: 0.95 }
const visualCases = new Set(["landscape-detail", "portrait-detail", "high-entropy-alpha", "square-alpha", "repository-dark-texture", "display-p3", "cmyk-jpeg", "palette-alpha", "png-16bit", "exif-5", "exif-6", "exif-7", "exif-8", "boundary-jpeg-textured", "boundary-png-transparent"])

// 📚 El ejecutor solo permite el piloto conocido y un runtime; las entradas y salidas de QA no se integran en el frontal.
async function main(): Promise<void> {
  assert.equal(process.env.MEDIA_QUALITY_TEST, "1", "Se requiere MEDIA_QUALITY_TEST=1")
  const url = new URL(DATABASE_URL)
  assert.equal(url.hostname, "127.0.0.1"); assert.equal(url.port, "55437"); assert.equal(url.pathname, "/weblogros_ui")
  const config = objectStoreConfigFromEnv()
  assert.equal(new URL(config.endpoint).hostname, "127.0.0.1"); assert.equal(new URL(config.endpoint).port, "8333"); assert.equal(config.bucket, "lockerboard-media-dev")
  const args = parseArgs({ options: { output: { type: "string" } }, strict: true })
  assert.ok(args.values.output, "Se requiere --output con un directorio nuevo de evidencia")
  const output = resolve(args.values.output)
  const repository = resolve(__dirname, "../../../../..")
  const expectedRepository = await realpath(repository)
  assert.equal(repository, expectedRepository)
  await mkdir(dirname(output), { recursive: true }); await mkdir(output)
  const variantsDirectory = join(output, "variants"), reviewDirectory = join(output, "review")
  await mkdir(variantsDirectory); await mkdir(reviewDirectory)
  const tempBase = await realpath(tmpdir()), work = await realpath(await mkdtemp(join(tempBase, "media-quality-")))
  const runtimeRoot = join(work, "runtime")
  const db = prisma, verifier = new ObjectStore(config)
  let runtime: MediaRuntime | null = null, server: Server | undefined, base = "", userId: number | undefined, teamId: number | undefined
  const allKeys = new Set<string>()
  const results: QualityCaseResult[] = []
  const runId = randomUUID()
  const counts = async () => ({ users: await db.user.count(), teams: await db.team.count(), memberships: await db.teamMembership.count(), logros: await db.logro.count(), proposals: await db.propuestaLogro.count(), drafts: await db.achievementDraft.count(), jobs: await db.mediaJob.count(), assets: await db.mediaAsset.count(), cleanups: await db.mediaAssetCleanup.count(), orphanCleanups: await db.mediaOrphanCleanup.count(), owners: await db.mediaRuntimeOwner.count() })
  const before = await counts()
  let after: typeof before | undefined, completed = false, cleanupVerified = false
  try {
    assert.equal(await db.mediaJob.count({ where: { activeResourceKey: { not: null } } }), 0, "No ejecutar junto a trabajos ajenos activos")
    const corpus = await generateQualityCorpus(join(work, "sources"), repository, id => console.log(`Fuente preparada: ${id}`))
    await writeFile(join(output, "corpus-manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), versions: sharp.versions, entries: publicCorpus(corpus) }, null, 2) + "\n")
    console.log(`Corpus: ${corpus.length} entradas con procedencia, dimensiones y SHA-256`)
    const user = await db.user.create({ data: { email: `media-quality-${runId}@example.invalid`, password: "no-login-test" } }); userId = user.id
    const team = await db.team.create({ data: { slug: `media-quality-${runId}`, nombre: "Media quality fixture" } }); teamId = team.id
    await db.teamMembership.create({ data: { userId, teamId, role: "TEAM_ADMIN" } })
    process.env.MEDIA_ENABLED = "true"; process.env.MEDIA_TEMP_ROOT = runtimeRoot; process.env.MEDIA_ALLOWED_ORIGINS = "http://localhost:3000"
    runtime = await startMediaRuntimeFromEnv(); assert.ok(runtime)
    const app = express(); app.use(express.json()); app.use(cookieParser()); app.use("/equipos/:slug", equiposRouter); app.use(errorHandler)
    server = createServer(app); await new Promise<void>(r => server!.listen(0, "127.0.0.1", r))
    const address = server.address(); assert.ok(address && typeof address !== "string"); base = `http://127.0.0.1:${address.port}/equipos/${team.slug}`
    const headers = { Cookie: `auth_token=${jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30m" })}`, Origin: "http://localhost:3000" }
    const call = async (path: string, body: unknown) => {
      const response = await fetch(`${base}${path}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) })
      const json = await response.json() as any; assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(json)}`); return json
    }
    const waitForJob = async (id: string) => {
      for (let i = 0; i < 600; i++) { const job = await db.mediaJob.findUniqueOrThrow({ where: { id } }); if (!job.activeResourceKey) return job; await delay(50) }
      throw new Error("QUALITY_JOB_TIMEOUT")
    }
    for (const [index, entry] of corpus.entries()) {
      const record: QualityCaseResult = { id: entry.id, expected: entry.expected, variants: [], panels: [], alerts: [], outcome: "RUNNING" }
      results.push(record)
      const direct = index % 3 === 0
      const draft = await call("/borradores", { purpose: direct ? "DIRECT" : "PROPOSAL", fields: { nombre: `QA ${entry.id}`, descripcion: "Synthetic quality fixture", criterios: ["Verified corpus"], ...(direct ? { puntos: 1 } : {}) } })
      const data = await readFile(entry.path); assert.equal(sha256(data), entry.sha256)
      const form = new FormData()
      // 📚 Nombre/MIME engañosos comprueban que se inspeccionan los bytes, no la extensión del cliente.
      form.set("image", new Blob([new Uint8Array(data)], { type: "image/jpeg" }), "untrusted-client-name.jpg")
      const response = await fetch(`${base}/borradores/${draft.id}/imagen`, { method: "POST", headers, body: form, signal: AbortSignal.timeout(120_000) })
      const body = await response.json() as any
      assert.equal(response.status, entry.expected.status, `${entry.id}: HTTP ${response.status}, ${JSON.stringify(body)}`)
      record.httpStatus = response.status
      let imageAssetId: string | null = null
      if (response.status === 202) {
        const job = await waitForJob(body.job.id)
        record.jobStatus = job.status; record.failureCode = job.failureCode
        assert.equal(job.status, entry.expected.failureCode ? "FAILED" : "SUCCEEDED", `${entry.id}: ${job.failureCode}`)
        if (entry.expected.failureCode) assert.equal(job.failureCode, entry.expected.failureCode)
        const current = await db.achievementDraft.findUniqueOrThrow({ where: { id: draft.id } }); imageAssetId = current.imageAssetId
      }
      if (entry.expected.status !== 202 || entry.expected.failureCode) {
        assert.equal(imageAssetId, null)
        const current = await db.achievementDraft.findUniqueOrThrow({ where: { id: draft.id } })
        assert.equal(current.status, "DRAFT"); assert.equal(current.version, 1)
        await call(`/borradores/${draft.id}/descartar`, { version: current.version })
        record.outcome = "PASS_REJECTED"; console.log(`PASS ${entry.id}: HTTP ${response.status}${record.failureCode ? ` / ${record.failureCode}` : ""}`); continue
      }
      assert.ok(imageAssetId)
      const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: imageAssetId } })
      const variants = mediaAssetVariantSchema.array().parse(asset.variants)
      const expectedDimensions = [1280, 640, 320].map(edge => { const ratio = Math.min(1, edge / Math.max(entry.expected.width!, entry.expected.height!)); return [Math.max(1, Math.round(entry.expected.width! * ratio)), Math.max(1, Math.round(entry.expected.height! * ratio))] }).filter((v, i, all) => all.findIndex(p => p[0] === v[0] && p[1] === v[1]) === i)
      assert.deepEqual(variants.map(v => [v.width, v.height]), expectedDimensions, `${entry.id}: dimensiones`)
      const current = await db.achievementDraft.findUniqueOrThrow({ where: { id: draft.id } })
      const submitted = await call(direct ? "/logros" : "/propuestas", { borradorId: draft.id, version: current.version })
      const imagePath = direct ? `/logros/${submitted.id}/imagen` : `/propuestas/${submitted.id}/imagen`
      if (!direct) {
        if (index % 2) await call(`/admin/propuestas/${submitted.id}/aceptar`, { puntos: 1 })
        else await call(`/admin/propuestas/${submitted.id}/rechazar`, { reason: "QA rejection retention" })
      }
      record.productFlow = direct ? "DIRECT" : index % 2 ? "PROPOSAL_ACCEPTED" : "PROPOSAL_REJECTED"
      for (const [variantIndex, variant] of variants.entries()) {
        allKeys.add(variant.key)
        const size = [1280,640,320][variantIndex]
        const privateRead = await fetch(`${base}${imagePath}?size=${size}`, { headers, signal: AbortSignal.timeout(30_000) })
        assert.equal(privateRead.status, 200); assert.equal(privateRead.headers.get("cache-control"), "private, no-cache")
        const bytes = Buffer.from(await privateRead.arrayBuffer()); assert.equal(sha256(bytes), variant.sha256); assert.equal(bytes.length, variant.size)
        const meta = await sharp(bytes).metadata()
        assert.equal(meta.format, entry.expected.format); assert.equal(meta.space, "srgb"); assert.equal(meta.depth, "uchar")
        for (const key of ["exif","xmp","icc","iptc","orientation"] as const) assert.equal(meta[key], undefined, `${entry.id}: metadato ${key} retenido`)
        if (meta.format === "png") assert.notEqual(bytes[25], 3, `${entry.id}: paleta en salida`)
        // 📚 Referencia lossless al mismo tamaño/espacio/orientación: se aísla la pérdida de la compresión final de la reducción necesaria.
        const reference = await makeLosslessReference(data, size)
        const expectedPixels = await sharp(reference).ensureAlpha().raw().toBuffer()
        const actualPixels = await sharp(bytes).ensureAlpha().raw().toBuffer()
        const metrics = comparePixels(expectedPixels, actualPixels, variant.width, variant.height)
        if (meta.format === "png") assert.equal(metrics.exactPixels, true, `${entry.id}: pérdida inesperada PNG`)
        if (entry.expected.orientation) assertOrientedCorners(actualPixels, variant.width, variant.height, entry.expected.orientation)
        if (meta.format === "jpeg" && ((metrics.psnrDb !== null && metrics.psnrDb < JPEG_REVIEW_THRESHOLDS.psnrDb) || metrics.ssimLuma < JPEG_REVIEW_THRESHOLDS.ssimLuma)) record.alerts.push({ variant: size, reason: "JPEG_METRIC_REQUIRES_VISUAL_REVIEW" })
        const filename = `${entry.id}-${variant.width}x${variant.height}.${meta.format === "jpeg" ? "jpg" : "png"}`
        await writeFile(join(variantsDirectory, filename), bytes)
        record.variants.push({ filename, width: variant.width, height: variant.height, bytes: variant.size, sha256: variant.sha256, metrics, privateReadVerified: true })
        if (visualCases.has(entry.id) && (variantIndex === 0 || variantIndex === variants.length - 1)) record.panels.push(await makeReviewPanel(reference, bytes, reviewDirectory, entry.id, String(size)))
      }
      record.outcome = "PASS_PROCESSED"
      console.log(`PASS ${entry.id}: ${record.productFlow}, ${variants.length} variantes${record.alerts.length ? `, ${record.alerts.length} avisos de revisión` : ""}`)
    }
    completed = true
  } finally {
    await runtime?.stop()
    if (server) { server.closeAllConnections(); await new Promise<void>(r => server!.close(() => r())) }
    if (teamId) {
      for (const asset of await db.mediaAsset.findMany({ where: { teamId } })) for (const variant of mediaAssetVariantSchema.array().parse(asset.variants)) allKeys.add(variant.key)
      for (const key of allKeys) { await verifier.delete(key); assert.equal(await verifier.head(key), null) }
      await db.achievementDraft.deleteMany({ where: { teamId } }); await db.propuestaLogro.deleteMany({ where: { teamId } }); await db.logro.deleteMany({ where: { teamId } })
      await db.mediaAssetCleanup.deleteMany({ where: { asset: { teamId } } }); await db.mediaAsset.deleteMany({ where: { teamId } }); await db.mediaJob.deleteMany({ where: { teamId } })
      if (runtime) await db.mediaRuntimeOwner.deleteMany({ where: { id: runtime.ownerId } })
      await db.teamMembership.deleteMany({ where: { teamId } }); await db.team.delete({ where: { id: teamId } })
    }
    if (userId) await db.user.delete({ where: { id: userId } })
    after = await counts(); assert.deepEqual(after, before, "El ensayo no puede dejar filas ni modificar conteos ajenos")
    assert.equal(dirname(work), tempBase); assert.ok(work.startsWith(join(tempBase, "media-quality-"))); assert.equal(await realpath(work), work)
    await rm(work, { recursive: true }); cleanupVerified = true
    verifier.destroy(); await db.$disconnect()
    const report = { createdAt: new Date().toISOString(), scope: "achievement corpus and backend quality; no frontend or sustained load", runId, completed, cleanupVerified, thresholds: JPEG_REVIEW_THRESHOLDS, thresholdPolicy: "metric warnings require recorded visual review; no compression changes", counts: { before, after }, sourceWorkspacesRemoved: true, ownS3KeysDeletedAndHeadVerified: allKeys.size, results }
    await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n")
    await writeFile(join(output, "summary.json"), JSON.stringify({ ...summarizeQuality(results), completed, cleanupVerified, ownS3KeysDeletedAndHeadVerified: allKeys.size }, null, 2) + "\n")
    await writeFile(join(output, "review.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><title>Corpus de logros: revisión técnica</title><style>body{font:16px system-ui;margin:32px;background:#eee;color:#182431}img{max-width:1040px;height:auto;display:block;margin:20px 0 40px}h2{margin-top:50px}a{color:#164fa0}</style><h1>Revisión técnica de imágenes de logros</h1><p>Paneles locales 1×/2×; no acreditan QA de navegador ni del frontal. Referencia a la izquierda, salida productiva a la derecha.</p>${results.map(r => `<h2>${r.id} · ${r.outcome}</h2><p>${r.alerts.length} avisos de métricas. ${r.variants.map((v: any) => `<a href="variants/${v.filename}">${v.width}×${v.height}</a>`).join(" / ")}</p>${r.panels.map((p: string) => `<img loading="lazy" src="review/${p}" alt="${r.id} referencia y salida a 1x y 2x">`).join("")}`).join("")}</html>`)
    console.log(`Resultado: ${completed ? "PASS técnico" : "INCOMPLETO"}; limpieza verificada=${cleanupVerified}; objetos propios=${allKeys.size}`)
  }
}
if (require.main === module) void main().catch(error => { console.error("Quality run failed", error instanceof assert.AssertionError ? error.message : error instanceof Error ? error.message : "Unknown failure"); process.exitCode = 1 })
