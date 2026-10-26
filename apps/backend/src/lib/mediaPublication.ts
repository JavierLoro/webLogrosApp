import { createHash, randomUUID } from "node:crypto"
import { constants } from "node:fs"
import { lstat, open, readdir, realpath } from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { Readable } from "node:stream"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { parseImageTarget, imageObjectKey, lockImageTarget, type ImageTarget } from "./mediaTargets"
import { imageManifestSchema, type ImageManifest } from "./mediaImageProtocol"
import type { ClaimedMediaJob } from "./mediaJobClaims"
import { cleanupMediaAssetCleanup } from "./mediaAssetCleanup"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import prisma from "./prisma"

const MAX_VARIANT_BYTES = 10_000_000
const MAX_TOTAL_VARIANT_BYTES = 20_000_000

// 📚 Esta interfaz pequeña deja probar el dominio con un almacén falso y mantiene los comandos S3 fuera de la lógica.
export type MediaPublicationStore = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  head(key: string): Promise<{ contentType?: string; contentLength?: number; etag?: string } | null>
  get(key: string): Promise<{ body: Readable; contentType?: string; contentLength?: number; etag?: string } | null>
  delete(key: string): Promise<void>
}

export const mediaAssetVariantSchema = z.object({
  key: z.string().min(1).max(1024),
  filename: z.string().regex(/^image-[1-9]\d*x[1-9]\d*\.(jpg|png)$/),
  size: z.number().int().positive().max(MAX_VARIANT_BYTES),
  width: z.number().int().positive().max(1280),
  height: z.number().int().positive().max(1280),
  format: z.enum(["jpeg", "png"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
}).strict()
export type MediaAssetVariant = z.infer<typeof mediaAssetVariantSchema>

const claimSchema = z.object({
  id: z.string().uuid(), ownerId: z.number().int().positive(), teamId: z.number().int().positive(),
  resourceKey: z.string().min(1).max(255), slot: z.union([z.literal(1), z.literal(2)]),
  executionToken: z.string().uuid(), startedAt: z.date(),
}).strict()
const workspaceSchema = z.object({ temporaryRoot: z.string().min(1), signal: z.custom<AbortSignal>().optional() }).strict()
type PublicationDatabase = PrismaClient
type PublicationWorkspace = { root: string; jobDirectory: string; resultDirectory: string }
type FilePlan = { path: string; metadata: MediaAssetVariant }

// 📚 La publicación usa este marcador interno cuando la petición duradera ganó
// 📚 el lock, aunque el AbortSignal local todavía no haya llegado al proceso.
class PublicationCancellationError extends AppError {
  constructor() {
    super(409, "Se canceló la publicación de la imagen")
    this.name = "PublicationCancellationError"
  }
}

// 📚 El tipo HTTP depende del formato real de los bytes procesados, nunca de una extensión aportada por el navegador.
function contentTypeFor(format: "jpeg" | "png"): string {
  return format === "jpeg" ? "image/jpeg" : "image/png"
}

// 📚 Las rutas se derivan del UUID del claim y se canonicalizan antes de leer; una ruta persistida no se considera confiable por sí sola.
async function validateWorkspace(temporaryRoot: string, jobId: string, inputDirectory: string, resultDirectory: string): Promise<PublicationWorkspace> {
  const root = resolve(temporaryRoot)
  const jobDirectory = join(root, jobId)
  try {
    const rootInfo = await lstat(root)
    const jobInfo = await lstat(jobDirectory)
    const resultInfo = await lstat(resultDirectory)
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || await realpath(root) !== root
      || !jobInfo.isDirectory() || jobInfo.isSymbolicLink() || await realpath(jobDirectory) !== jobDirectory
      || inputDirectory !== jobDirectory || resolve(resultDirectory) !== resultDirectory || dirname(resultDirectory) !== jobDirectory
      || !basename(resultDirectory).startsWith("variants-")
      || !resultInfo.isDirectory() || resultInfo.isSymbolicLink() || await realpath(resultDirectory) !== resultDirectory) {
      throw new Error("INVALID_WORKSPACE")
    }
    return { root, jobDirectory, resultDirectory }
  } catch {
    throw new AppError(422, "El resultado temporal no pertenece a esta publicación")
  }
}

// 📚 open(O_NOFOLLOW) y fstat cierran la ventana entre comprobar una ruta y leerla; el límite se aplica también al tamaño real.
async function readBoundedRegularFile(path: string, maximum: number): Promise<Buffer> {
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink() || info.size <= 0 || info.size > maximum) throw new Error("INVALID_VARIANT_FILE")
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
  try {
    const opened = await handle.stat()
    if (!opened.isFile() || opened.size !== info.size || opened.size > maximum) throw new Error("INVALID_VARIANT_FILE")
    const chunks: Buffer[] = []
    let total = 0
    while (true) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, maximum + 1 - total))
      const { bytesRead } = await handle.read(chunk, 0, chunk.byteLength, null)
      if (bytesRead === 0) break
      total += bytesRead
      if (total > maximum) throw new Error("INVALID_VARIANT_FILE")
      chunks.push(chunk.subarray(0, bytesRead))
    }
    if (total !== opened.size) throw new Error("INVALID_VARIANT_FILE")
    return Buffer.concat(chunks, total)
  } finally {
    await handle.close()
  }
}

// 📚 Se prepara un diario completo de claves antes del primer PUT para que cualquier caída permita encontrar los objetos parciales.
async function makeFilePlan(
  workspace: PublicationWorkspace,
  target: ImageTarget,
  jobId: string,
  manifest: ImageManifest,
): Promise<FilePlan[]> {
  const names = await readdir(workspace.resultDirectory)
  const expected = manifest.variants.map(({ filename }) => filename).sort()
  if (names.length !== expected.length || [...names].sort().some((name, index) => name !== expected[index])) {
    throw new AppError(422, "El manifiesto no coincide con los archivos procesados")
  }
  let total = 0
  const plan: FilePlan[] = []
  for (const variant of manifest.variants) {
    if ((variant.format === "jpeg" && !variant.filename.endsWith(".jpg"))
      || (variant.format === "png" && !variant.filename.endsWith(".png"))) {
      throw new AppError(422, "El formato no coincide con el nombre de una variante")
    }
    const path = join(workspace.resultDirectory, variant.filename)
    const bytes = await readBoundedRegularFile(path, MAX_VARIANT_BYTES)
    if (bytes.byteLength !== variant.bytes) throw new AppError(422, "Una variante no coincide con su manifiesto")
    total += bytes.byteLength
    if (total > MAX_TOTAL_VARIANT_BYTES) throw new AppError(422, "Las variantes superan el límite de publicación")
    plan.push({
      path,
      metadata: {
        key: imageObjectKey(target, jobId, variant.filename),
        filename: variant.filename,
        size: bytes.byteLength,
        width: variant.width,
        height: variant.height,
        format: variant.format,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      },
    })
  }
  return plan
}

// 📚 SHA-256 permite comparar el contenido exacto aunque el proveedor use ETag multipart.
function digest(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex")
}

// 📚 GET se consume con límite y SHA-256 porque ETag puede ser multipart y no demuestra la identidad de los bytes.
async function verifyStoredObject(store: MediaPublicationStore, item: MediaAssetVariant): Promise<void> {
  const head = await store.head(item.key)
  if (!head || head.contentLength !== item.size || head.contentType !== contentTypeFor(item.format)) {
    throw new Error("OBJECT_METADATA_MISMATCH")
  }
  const object = await store.get(item.key)
  if (!object || object.contentType !== contentTypeFor(item.format) || object.contentLength !== item.size) {
    throw new Error("OBJECT_READ_MISMATCH")
  }
  try {
    const chunks: Buffer[] = []
    let size = 0
    for await (const chunk of object.body) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += bytes.byteLength
      if (size > item.size || size > MAX_VARIANT_BYTES) throw new Error("OBJECT_TOO_LARGE")
      chunks.push(bytes)
    }
    if (size !== item.size || digest(Buffer.concat(chunks, size)) !== item.sha256) throw new Error("OBJECT_DIGEST_MISMATCH")
  } finally {
    if (!object.body.destroyed) object.body.destroy()
  }
}

// 📚 Repetimos toda la identidad de la toma en cada CAS para que una ejecución vieja no escriba sobre un claim nuevo.
function jobWhere(claim: z.infer<typeof claimSchema>, publisherStartedAt: Date | null): Prisma.MediaJobWhereInput {
  return {
    id: claim.id, ownerId: claim.ownerId, teamId: claim.teamId, resourceKey: claim.resourceKey,
    status: "PUBLISHING", processingSlot: claim.slot, executionToken: claim.executionToken,
    processingStartedAt: claim.startedAt, publisherStartedAt,
  }
}

// 📚 Un error de DB puede ocurrir después del commit; el mensaje indica incertidumbre y evita que el caller borre objetos.
function persistenceUnavailable(cause: unknown): AppError {
  const error = new AppError(503, "No se pudo confirmar la publicación de la imagen")
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}

async function reservePublication(
  claim: z.infer<typeof claimSchema>,
  startedAt: Date,
  target: ImageTarget,
  plan: FilePlan[],
  db: PublicationDatabase,
): Promise<string> {
  // 📚 Asset y marca one-shot se guardan juntos antes de S3, formando el diario recuperable de cada clave prevista.
  const assetId = randomUUID()
  try {
    await db.$transaction(async (tx) => {
      await lockImageTarget(tx, target, claim.ownerId)
      await lockMediaJobCoordination(tx)
      const changed = await tx.mediaJob.updateMany({
        where: jobWhere(claim, null),
        data: { publisherStartedAt: startedAt },
      })
      if (changed.count !== 1) throw new AppError(409, "La publicación ya fue iniciada o dejó de ser válida")
      await tx.mediaAsset.create({
        data: {
          id: assetId, jobId: claim.id, teamId: claim.teamId,
          variants: plan.map(({ metadata }) => metadata) as unknown as Prisma.InputJsonArray,
        },
      })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5_000, maxWait: 2_000 })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw persistenceUnavailable(error)
  }
  return assetId
}

async function terminalizeBeforeReservation(
  claim: z.infer<typeof claimSchema>,
  resultDirectory: string | null,
  status: "FAILED" | "CANCELED",
  failureCode: string,
  db: PublicationDatabase,
): Promise<void> {
  // 📚 Un resultado inválido o una cancelación antes de S3 también debe liberar el slot; CAS evita cerrar una toma que ya cambió.
  try {
    const changed = await db.mediaJob.updateMany({
      where: jobWhere(claim, null),
      data: {
        status, activeResourceKey: null, processingSlot: null, completedAt: new Date(), failureCode,
        cleanupPendingDirectory: resultDirectory, resultDirectory: null, resultManifest: Prisma.DbNull,
      },
    })
    if (changed.count !== 1) throw new AppError(409, "La toma cambió antes de guardar el resultado terminal")
  } catch (error) {
    if (error instanceof AppError) throw error
    throw persistenceUnavailable(error)
  }
}

async function terminalizeUnassociated(
  claim: z.infer<typeof claimSchema>,
  publisherStartedAt: Date,
  assetId: string,
  resultDirectory: string | null,
  status: "FAILED" | "CANCELED",
  failureCode: string,
  db: PublicationDatabase,
): Promise<string> {
  // 📚 Solo se usa cuando no hubo asociación: retira el staging y registra cada clave antes de pedir su borrado.
  try {
    return await db.$transaction(async (tx) => {
      const asset = await tx.mediaAsset.findUnique({ where: { id: assetId }, select: { variants: true, state: true } })
      if (!asset || asset.state !== "STAGING") throw new AppError(409, "El asset temporal dejó de estar disponible")
      const variants = z.array(mediaAssetVariantSchema).min(1).max(3).parse(asset.variants)
      await tx.mediaAsset.update({ where: { id: assetId }, data: { state: "RETIRED" } })
      const cleanup = await tx.mediaAssetCleanup.create({ data: { assetId, keys: variants.map(({ key }) => key) } })
      const changed = await tx.mediaJob.updateMany({
        where: jobWhere(claim, publisherStartedAt),
        data: {
          status, activeResourceKey: null, processingSlot: null, completedAt: new Date(), failureCode,
          cleanupPendingDirectory: resultDirectory, resultDirectory: null, resultManifest: Prisma.DbNull,
        },
      })
      if (changed.count !== 1) throw new AppError(409, "La toma cambió antes de guardar el resultado terminal")
      return cleanup.id
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5_000, maxWait: 2_000 })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw persistenceUnavailable(error)
  }
}

// 📚 Publicar es un paso one-shot: reserva y diario en PostgreSQL preceden S3, y la referencia del catálogo solo cambia tras verificar los bytes.
export async function publishClaimedAchievementImage(
  claimInput: ClaimedMediaJob,
  workspaceInput: { temporaryRoot: string; signal?: AbortSignal },
  store: MediaPublicationStore,
  db: PublicationDatabase = prisma,
): Promise<{ id: string; status: "SUCCEEDED"; assetId: string; cancellation: "none" | "too_late" }> {
  const parsedClaim = claimSchema.safeParse(claimInput)
  const parsedWorkspace = workspaceSchema.safeParse(workspaceInput)
  if (!parsedClaim.success || !parsedWorkspace.success) throw new AppError(400, "La toma o el espacio de publicación no son válidos")
  const claim = parsedClaim.data
  const job = await db.mediaJob.findUnique({ where: { id: claim.id } })
  if (!job || job.status !== "PUBLISHING" || job.ownerId !== claim.ownerId || job.teamId !== claim.teamId
    || job.resourceKey !== claim.resourceKey || job.processingSlot !== claim.slot
    || job.executionToken !== claim.executionToken || job.processingStartedAt?.getTime() !== claim.startedAt.getTime()
    || job.imageKind !== "achievement" || job.publisherStartedAt) {
    throw new AppError(409, "La toma no está disponible para publicación")
  }
  if (job.cancelRequestedAt) {
    await terminalizeBeforeReservation(claim, job.resultDirectory, "CANCELED", "CANCELED", db)
    throw new AppError(409, "Se canceló la publicación de la imagen")
  }
  let target: ImageTarget
  let workspace: PublicationWorkspace
  let plan: FilePlan[]
  try {
    if (parsedWorkspace.data.signal?.aborted) throw new AppError(409, "Se canceló la publicación de la imagen")
    const parsedTarget = parseImageTarget(job.resourceKey)
    if (!parsedTarget || parsedTarget.teamId !== claim.teamId) throw new AppError(409, "El destino del trabajo no es un logro válido")
    target = parsedTarget
    const manifestResult = imageManifestSchema.safeParse(job.resultManifest)
    if (!manifestResult.success || manifestResult.data.kind !== "achievement") throw new AppError(422, "El manifiesto de la imagen no es válido")
    if (!job.resultDirectory || !job.resultManifest) throw new AppError(422, "El trabajo no conserva un resultado procesado")
    if (!job.inputDirectory) throw new AppError(422, "El trabajo no conserva su directorio de entrada")
    workspace = await validateWorkspace(parsedWorkspace.data.temporaryRoot, claim.id, job.inputDirectory, job.resultDirectory)
    plan = await makeFilePlan(workspace, target, claim.id, manifestResult.data)
  } catch (error) {
    const canceled = parsedWorkspace.data.signal?.aborted === true
    await terminalizeBeforeReservation(claim, job.resultDirectory, canceled ? "CANCELED" : "FAILED", canceled ? "CANCELED" : "PUBLICATION_VALIDATION_FAILED", db)
    if (canceled) throw new AppError(409, "Se canceló la publicación de la imagen")
    if (error instanceof AppError) throw error
    const invalid = new AppError(422, "El resultado temporal no pudo validarse")
    Object.defineProperty(invalid, "cause", { value: error, enumerable: false })
    throw invalid
  }
  const publisherStartedAt = new Date()
  let assetId: string
  try {
    assetId = await reservePublication(claim, publisherStartedAt, target, plan, db)
  } catch (error) {
    if (error instanceof AppError && [403, 404, 409].includes(error.statusCode)) {
      const cancellation = await db.mediaJob.findUnique({ where: { id: claim.id }, select: { cancelRequestedAt: true } })
      const canceled = parsedWorkspace.data.signal?.aborted === true || !!cancellation?.cancelRequestedAt
      await terminalizeBeforeReservation(claim, job.resultDirectory, canceled ? "CANCELED" : "FAILED", canceled ? "CANCELED" : "PUBLICATION_AUTHORIZATION_CHANGED", db)
      if (canceled) throw new AppError(409, "Se canceló la publicación de la imagen")
    }
    throw error
  }

  try {
    // 📚 Se confirma el claim antes de cada escritura; las claves ya están en MediaAsset si el proceso cae durante la secuencia.
    for (const { path, metadata } of plan) {
      if (parsedWorkspace.data.signal?.aborted) throw new AppError(409, "Se canceló la publicación de la imagen")
      const bytes = await readBoundedRegularFile(path, MAX_VARIANT_BYTES)
      if (bytes.byteLength !== metadata.size || digest(bytes) !== metadata.sha256) throw new Error("LOCAL_VARIANT_CHANGED")
      await store.put(metadata.key, bytes, contentTypeFor(metadata.format))
      await verifyStoredObject(store, metadata)
    }
  } catch (error) {
    const status = parsedWorkspace.data.signal?.aborted ? "CANCELED" : "FAILED"
    const code = status === "CANCELED" ? "CANCELED" : "PUBLICATION_FAILED"
    const cleanupId = await terminalizeUnassociated(claim, publisherStartedAt, assetId, job.resultDirectory, status, code, db)
    try { await cleanupMediaAssetCleanup(cleanupId, store, db) } catch { /* La cola durable conserva el siguiente intento. */ }
    if (status === "CANCELED") throw new AppError(409, "Se canceló la publicación de la imagen")
    const failure = new AppError(422, "No se pudo publicar la imagen procesada")
    Object.defineProperty(failure, "cause", { value: error, enumerable: false })
    throw failure
  }

  if (parsedWorkspace.data.signal?.aborted) {
    const cleanupId = await terminalizeUnassociated(claim, publisherStartedAt, assetId, job.resultDirectory, "CANCELED", "CANCELED", db)
    try { await cleanupMediaAssetCleanup(cleanupId, store, db) } catch { /* El journal permite limpiar tras un reinicio. */ }
    throw new AppError(409, "Se canceló la publicación de la imagen")
  }

  let retiredCleanupId: string | null
  try {
    retiredCleanupId = await db.$transaction(async (tx) => {
      const oldAssetId = await lockImageTarget(tx, target, claim.ownerId)
      await lockMediaJobCoordination(tx)
      const currentJob = await tx.mediaJob.findFirst({ where: jobWhere(claim, publisherStartedAt), select: { cancelRequestedAt: true } })
      if (!currentJob || currentJob.cancelRequestedAt) throw new PublicationCancellationError()
      if (parsedWorkspace.data.signal?.aborted) throw new PublicationCancellationError()
      const staging = await tx.mediaAsset.findFirst({ where: { id: assetId, jobId: claim.id, teamId: claim.teamId, state: "STAGING" }, select: { id: true } })
      if (!staging) throw new AppError(409, "El asset o el destino dejó de estar disponible")
      let oldCleanupId: string | null = null
      if (oldAssetId) {
        const old = await tx.mediaAsset.findUnique({ where: { id: oldAssetId }, select: { id: true, state: true, variants: true } })
        if (!old || old.state !== "READY") throw new AppError(409, "La imagen anterior no está en un estado válido")
        const oldVariants = z.array(mediaAssetVariantSchema).min(1).max(3).parse(old.variants)
        await tx.mediaAsset.update({ where: { id: old.id }, data: { state: "RETIRED" } })
        const cleanup = await tx.mediaAssetCleanup.create({ data: { assetId: old.id, keys: oldVariants.map(({ key }) => key) } })
        oldCleanupId = cleanup.id
      }
      await tx.mediaAsset.update({ where: { id: assetId }, data: { state: "READY" } })
      // 📚 La imagen cambia la versión del borrador: una pestaña con texto anterior no puede enviarlo por accidente.
      const associated = target.kind === "achievement"
        ? await tx.logro.updateMany({ where: { id: target.id, teamId: target.teamId, imageAssetId: oldAssetId }, data: { imageAssetId: assetId } })
        : target.kind === "draft"
          ? await tx.achievementDraft.updateMany({ where: { id: target.id, teamId: target.teamId, userId: claim.ownerId, status: "DRAFT", imageAssetId: oldAssetId }, data: { imageAssetId: assetId, version: { increment: 1 } } })
          : await tx.propuestaLogro.updateMany({ where: { id: target.id, teamId: target.teamId, userId: claim.ownerId, status: "PENDING", imageRepairAllowed: true, imageAssetId: null }, data: { imageAssetId: assetId, imageRepairAllowed: false } })
      if (associated.count !== 1) throw new AppError(409, "El destino cambió antes de asociar la imagen")
      const completed = await tx.mediaJob.updateMany({
        where: jobWhere(claim, publisherStartedAt),
        data: {
          status: "SUCCEEDED", activeResourceKey: null, processingSlot: null, completedAt: new Date(), failureCode: null,
          cleanupPendingDirectory: job.resultDirectory, resultDirectory: null, resultManifest: Prisma.DbNull,
        },
      })
      if (completed.count !== 1) throw new AppError(409, "La toma cambió antes de confirmar la publicación")
      return oldCleanupId
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 5_000, maxWait: 2_000 })
  } catch (error) {
    // 📚 Un commit incierto conserva S3 y las referencias STAGING: borrar podría destruir un asset cuya transacción sí se confirmó.
    if (error instanceof AppError) {
      const cancellation = await db.mediaJob.findUnique({ where: { id: claim.id }, select: { cancelRequestedAt: true } })
      const canceled = parsedWorkspace.data.signal?.aborted === true || error instanceof PublicationCancellationError || !!cancellation?.cancelRequestedAt
      try {
        const cleanupId = await terminalizeUnassociated(
          claim, publisherStartedAt, assetId, job.resultDirectory,
          canceled ? "CANCELED" : "FAILED", canceled ? "CANCELED" : "PUBLICATION_TARGET_CHANGED", db,
        )
        try { await cleanupMediaAssetCleanup(cleanupId, store, db) } catch { /* El registro durable conserva el reintento. */ }
      } catch { /* Si la CAS ya cambió, no inferimos que este asset sea seguro de borrar. */ }
      throw error
    }
    throw persistenceUnavailable(error)
  }

  if (retiredCleanupId) {
    try { await cleanupMediaAssetCleanup(retiredCleanupId, store, db) } catch { /* La limpieza durable conserva el reintento sin revertir el asset nuevo. */ }
  }

  return { id: claim.id, status: "SUCCEEDED", assetId, cancellation: parsedWorkspace.data.signal?.aborted ? "too_late" : "none" }
}
