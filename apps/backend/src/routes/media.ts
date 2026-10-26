import express, { Request, Response } from "express"
import { PrismaClient } from "@prisma/client"
import { pipeline } from "node:stream/promises"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { authMiddleware } from "../middleware/auth"
import { receiveAndQueueMediaJob } from "../lib/mediaUploadIntake"
import { imageTargetKey, lockImageTarget, type ImageTarget } from "../lib/mediaTargets"
import { assertAllowedOrigin } from "../middleware/mediaOrigin"
import { receiveAchievementImage } from "../lib/mediaAchievementTarget"
import { requestMediaJobCancellation } from "../lib/mediaJobCancellation"
import { cleanupTerminalMediaJobTemporaryFiles } from "../lib/mediaTemporaryCleanup"
import { createMediaHttpUploadBridge } from "../lib/mediaHttpUpload"
import { headPrivateMediaImage, primePrivateMediaImage, readPrivateMediaImage } from "../lib/mediaImageRead"
import { multipartContentTypeSchema } from "../lib/mediaUploadProtocol"
import { mediaAssetVariantSchema, type MediaPublicationStore } from "../lib/mediaPublication"
import type { MediaRuntimePort } from "../lib/mediaRuntime"
import prisma from "../lib/prisma"

type MediaRouterOptions = {
  db?: PrismaClient
  getRuntime: () => MediaRuntimePort | null
}

const positiveIdSchema = z.string().regex(/^[1-9]\d{0,9}$/).transform(Number).refine(Number.isSafeInteger)
const jobIdSchema = z.string().uuid()
const imageSizeSchema = z.enum(["320", "640", "1280"]).transform(Number)
const safeJobSelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  failureCode: true,
} as const

// 📚 El ID de ruta se valida como texto decimal canónico para rechazar arrays, signos y conversiones sorprendentes de Number().
function parsePositiveId(value: string | string[]): number {
  if (Array.isArray(value)) throw new AppError(400, "ID no válido")
  const parsed = positiveIdSchema.safeParse(value)
  if (!parsed.success) throw new AppError(400, "ID no válido")
  return parsed.data
}

// 📚 Un rechazo antes del parser mantiene el JSON de error y cierra el socket para no dejar un body sin consumir en keep-alive.
function rejectUnconsumedBody(req: Request, res: Response, error: AppError): never {
  req.pause()
  res.setHeader("Connection", "close")
  throw error
}

// 📚 Los errores de una carga detenida por límite se traducen a respuestas claras después de que el facade confirme su teardown.
function uploadBridgeError(failure: ReturnType<typeof createMediaHttpUploadBridge>["failure"]): AppError {
  if (failure === "BODY_TOO_LARGE") return new AppError(413, "El formulario de imagen supera el límite permitido")
  if (failure === "RECEIVE_TIMEOUT") return new AppError(408, "La recepción de imagen superó el tiempo permitido")
  if (failure === "RUNTIME_ABORTED") return new AppError(503, "La recepción de imágenes se ha detenido")
  return new AppError(400, "La recepción de imagen se interrumpió")
}

// 📚 La ruta elige el tipo; el navegador solo identifica el recurso de ese tenant, nunca una clave de almacenamiento.
function requestImageTarget(req: Request, teamId: number): ImageTarget {
  if (req.path.startsWith("/borradores/")) {
    const parsed = jobIdSchema.safeParse(req.params.id)
    if (!parsed.success) throw new AppError(400, "ID de borrador no válido")
    return { kind: "draft", teamId, id: parsed.data.toLowerCase() }
  }
  return { kind: req.path.startsWith("/propuestas/") ? "proposal" : "achievement", teamId, id: parsePositiveId(req.params.id) }
}

// 📚 If-None-Match se procesa solo después de autorizar y comprobar el HEAD del objeto privado.
function matchesIfNoneMatch(header: string | undefined, etag: string): boolean {
  if (!header) return false
  return header.split(",").some((value) => {
    const candidate = value.trim()
    return candidate === "*" || candidate === etag || candidate === `W/${etag}`
  })
}

// 📚 La fábrica inyecta Prisma y runtime para probar la API HTTP sin depender de singleton ni arrancar workers.
export function createMediaRouter(options: MediaRouterOptions) {
  const db = options.db ?? prisma
  const router = express.Router({ mergeParams: true })

  // 📚 El router se monta bajo todo el catálogo, así que el guard se limita a nuestros paths para no alterar las rutas existentes.
  const protectMediaRoute: express.RequestHandler = (req, res, next) => {
    res.setHeader("Cache-Control", "no-store")
    if (req.method === "POST") res.setHeader("Connection", "close")
    next()
  }
  const imagePaths = ["/logros/:id/imagen", "/borradores/:id/imagen", "/propuestas/:id/imagen"]
  const mediaPaths = [...imagePaths, "/media/trabajos/:id", "/media/trabajos/:id/cancelar"]
  router.use(mediaPaths, protectMediaRoute, authMiddleware)

  router.post(imagePaths, async (req, res) => {
    const userId = req.userId
    const teamId = req.team?.id
    if (!userId || !teamId) throw new AppError(401, "Sesión y equipo requeridos")
    const target = requestImageTarget(req, teamId)
    const runtime = options.getRuntime()
    if (!runtime || !runtime.accepting()) {
      rejectUnconsumedBody(req, res, new AppError(503, "La recepción de imágenes no está disponible"))
    }
    assertAllowedOrigin(req.get("origin"), runtime.allowedOrigins)
    const mediaType = req.get("content-type")
    if (!mediaType || !multipartContentTypeSchema.safeParse(mediaType).success) {
      rejectUnconsumedBody(req, res, new AppError(415, "La imagen debe enviarse como multipart/form-data"))
    }

    // 📚 La admisión repetirá esta autorización bajo locks antes de reservar capacidad.
    await db.$transaction(tx => lockImageTarget(tx, target, userId))

    let receipt: Awaited<ReturnType<MediaRuntimePort["acquireReceipt"]>>
    try {
      receipt = await runtime.acquireReceipt()
    } catch (error) {
      if (error instanceof AppError) rejectUnconsumedBody(req, res, error)
      throw error
    }
    const bridge = createMediaHttpUploadBridge(req, res, receipt.signal)
    let receiptReleased = false
    const releaseReceipt = (): void => {
      if (receiptReleased) return
      receiptReleased = true
      receipt.release()
    }
    try {
      const result = await receipt.runOwned(() => target.kind === "achievement"
        ? receiveAchievementImage(bridge.source, req.headers, { ownerId: userId, teamId, achievementId: target.id }, { temporaryRoot: runtime.temporaryRoot, signal: bridge.signal }, db)
        : receiveAndQueueMediaJob(bridge.source, req.headers, { ownerId: userId, teamId, resourceKey: imageTargetKey(target), imageKind: "achievement" }, { temporaryRoot: runtime.temporaryRoot, signal: bridge.signal }, db))
      bridge.markAccepted()
      releaseReceipt()
      runtime.wake()
      res.status(202).json({ job: result.job, cancellation: result.cancellation })
    } catch (error) {
      if (res.destroyed || res.writableEnded) return
      if (bridge.failure === "CLIENT_DISCONNECTED") return
      if (bridge.failure) {
        res.setHeader("Connection", "close")
        throw uploadBridgeError(bridge.failure)
      }
      if (!req.complete) {
        req.pause()
        res.setHeader("Connection", "close")
      }
      throw error
    } finally {
      bridge.dispose()
      releaseReceipt()
    }
  })

  router.get("/media/trabajos/:id", async (req, res) => {
    const userId = req.userId
    const teamId = req.team?.id
    if (!userId || !teamId) throw new AppError(401, "Sesión y equipo requeridos")
    const parsedId = jobIdSchema.safeParse(req.params.id)
    if (!parsedId.success) throw new AppError(400, "ID de trabajo no válido")
    const membership = await db.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } }, select: { id: true },
    })
    if (!membership) throw new AppError(403, "No perteneces a este equipo")
    const job = await db.mediaJob.findFirst({
      where: { id: parsedId.data, ownerId: userId, teamId },
      select: safeJobSelect,
    })
    if (!job) throw new AppError(404, "Trabajo de imagen no encontrado")
    // 📚 El estado devuelto es directamente el DTO público, sin envolver ni proyectar claves privadas del registro.
    res.json(job)
  })

  // 📚 Persistimos la intención antes de despertar el ejecutor: otra petición o
  // 📚 un reinicio pueden observarla sin depender del AbortController de esta ruta.
  router.post("/media/trabajos/:id/cancelar", async (req, res) => {
    const ownerId = req.userId
    const teamId = req.team?.id
    if (!ownerId || !teamId) throw new AppError(401, "Sesión y equipo requeridos")
    const parsedId = jobIdSchema.safeParse(req.params.id)
    if (!parsedId.success) throw new AppError(400, "ID de trabajo no válido")
    const runtime = options.getRuntime()
    if (!runtime || !runtime.accepting()) throw new AppError(503, "La gestión de imágenes no está disponible")
    assertAllowedOrigin(req.get("origin"), runtime.allowedOrigins)
    const result = await requestMediaJobCancellation({ id: parsedId.data, ownerId, teamId }, db)
    if (result.cancellation === "canceled") {
      // 📚 El terminal ya está confirmado; fallar al borrar deja un pending
      // 📚 recuperable, nunca convierte una cancelación correcta en fallo de subida.
      try { await cleanupTerminalMediaJobTemporaryFiles(parsedId.data, runtime.temporaryRoot, db) }
      catch { console.error("Media cancellation cleanup pending", { jobId: parsedId.data }) }
    }
    runtime.wake()
    // 📚 202 significa petición registrada, no proceso ya cerrado. Solo CANCELED
    // 📚 confirmado responde 200; un commit definitivo que ganó la carrera da 409.
    res.status(result.cancellation === "requested" ? 202 : result.cancellation === "canceled" ? 200 : 409).json(result)
  })

  router.get(imagePaths, async (req, res) => {
    const userId = req.userId
    const teamId = req.team?.id
    if (!userId || !teamId) throw new AppError(401, "Sesión y equipo requeridos")
    const kind = req.path.startsWith("/borradores/") ? "draft" : req.path.startsWith("/propuestas/") ? "proposal" : "achievement"
    const achievementId = kind === "draft" ? 0 : parsePositiveId(req.params.id)
    const membership = await db.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } }, select: { role: true },
    })
    if (!membership) throw new AppError(403, "No perteneces a este equipo")
    const rawSize = req.query.size
    if (Array.isArray(rawSize)) throw new AppError(400, "Tamaño de imagen no válido")
    const size = rawSize === undefined ? { success: true as const, data: 1280 } : imageSizeSchema.safeParse(rawSize)
    if (!size.success) throw new AppError(400, "Tamaño de imagen no válido")
    const requestedSize = size.data

    const assetSelect = { id: true, state: true, variants: true } as const
    let achievement: { id: number; isSecret: boolean; imageAsset: { id: string; state: string; variants: unknown } | null } | null = null
    if (kind === "achievement") achievement = await db.logro.findFirst({
      where: { id: achievementId, teamId }, select: { id: true, isSecret: true, imageAsset: { select: assetSelect } },
    })
    else if (kind === "draft") {
      const parsed = jobIdSchema.safeParse(req.params.id)
      if (!parsed.success) throw new AppError(400, "ID de borrador no válido")
      const draft = await db.achievementDraft.findFirst({ where: { id: parsed.data, userId, teamId, status: "DRAFT" }, select: { imageAsset: { select: assetSelect } } })
      if (draft) achievement = { id: 0, isSecret: false, imageAsset: draft.imageAsset }
    } else {
      const proposal = await db.propuestaLogro.findFirst({ where: { id: achievementId, teamId, ...(membership.role === "TEAM_ADMIN" ? {} : { userId }) }, include: { imageAsset: { select: assetSelect }, logro: { select: { id: true, isSecret: true, imageAsset: { select: assetSelect } } } } })
      if (proposal) achievement = proposal.status === "ACCEPTED" ? proposal.logro : { id: 0, isSecret: false, imageAsset: proposal.imageAsset }
    }
    if (!achievement) throw new AppError(404, "Logro no encontrado")
    if (membership.role !== "TEAM_ADMIN" && achievement.isSecret) {
      const revealed = await db.userLogro.count({ where: { logroId: achievement.id, logro: { teamId } } })
      if (revealed === 0) throw new AppError(404, "Logro no encontrado")
    }
    const asset = achievement.imageAsset
    if (!asset || asset.state !== "READY") throw new AppError(404, "Imagen no encontrada")
    const parsedVariants = z.array(mediaAssetVariantSchema).min(1).max(3).safeParse(asset.variants)
    if (!parsedVariants.success) throw new AppError(503, "La imagen privada no está disponible")
    const variants = [...parsedVariants.data].sort((left, right) => Math.max(left.width, left.height) - Math.max(right.width, right.height))
    const variant = variants.find((item) => Math.max(item.width, item.height) >= requestedSize) ?? variants[variants.length - 1]
    const runtime = options.getRuntime()
    if (!runtime) throw new AppError(503, "La lectura de imágenes no está disponible")
    // 📚 Un único plazo cubre HEAD, GET y envío para que un cliente lento no bloquee el cierre del servidor.
    const readDeadline = AbortSignal.timeout(30_000)

    let metadata
    try {
      metadata = await headPrivateMediaImage(runtime.store, asset.id, variant, readDeadline)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(503, "La imagen privada no está disponible")
    }
    if (!metadata) throw new AppError(404, "Imagen no encontrada")
    if (matchesIfNoneMatch(req.get("if-none-match"), metadata.etag)) {
      res.setHeader("Cache-Control", "private, no-cache")
      res.setHeader("Vary", "Cookie")
      res.setHeader("ETag", metadata.etag)
      res.status(304).end()
      return
    }

    let body
    try {
      const unprimed = await readPrivateMediaImage(runtime.store, variant, metadata, readDeadline)
      if (!unprimed) {
        res.setHeader("Cache-Control", "no-store")
        throw new AppError(404, "Imagen no encontrada")
      }
      body = await primePrivateMediaImage(unprimed, readDeadline)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(503, "La imagen privada no está disponible")
    }
    // 📚 Los headers binarios se fijan después del primer fragmento, para que los fallos S3 tempranos sigan siendo JSON 503.
    res.setHeader("Cache-Control", "private, no-cache")
    res.setHeader("Vary", "Cookie")
    res.setHeader("ETag", metadata.etag)
    res.setHeader("Content-Type", metadata.contentType)
    res.setHeader("Content-Length", metadata.contentLength)
    res.setHeader("X-Content-Type-Options", "nosniff")
    try {
      await pipeline(body, res, { signal: readDeadline })
    } catch {
      if (res.headersSent) res.destroy()
      else {
        res.setHeader("Cache-Control", "no-store")
        throw new AppError(503, "La imagen privada no está disponible")
      }
    }
  })

  return router
}
