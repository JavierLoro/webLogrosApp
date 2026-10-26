import { Prisma, PrismaClient, AchievementDraftPurpose } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { crearLogroSchema } from "../schemas/logros"
import { crearPropuestaSchema } from "../schemas/propuestas"
import { draftFieldsSchema } from "../schemas/drafts"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import { cancelActiveTargetJobs } from "./mediaJobCancellation"
import { imageTargetKey } from "./mediaTargets"
import { mediaAssetVariantSchema, type MediaPublicationStore } from "./mediaPublication"
import { headPrivateMediaImage } from "./mediaImageRead"
import prisma from "./prisma"

export const DRAFT_LIMIT = 3
export const draftSelect = { id: true, purpose: true, status: true, fields: true, version: true, createdAt: true, updatedAt: true, resultId: true, submittedVersion: true } as const

// 📚 La cuota global usa User como mutex; las membresías distintas no bastarían para serializar dos equipos.
export async function lockDraftOwner(tx: Prisma.TransactionClient, userId: number, teamId: number, admin = false) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`
  const members = await tx.$queryRaw<Array<{ role: string }>>`SELECT "role" FROM "TeamMembership" WHERE "userId" = ${userId} AND "teamId" = ${teamId} FOR UPDATE`
  if (!members[0]) throw new AppError(403, "No perteneces a este equipo")
  if (admin && members[0].role !== "TEAM_ADMIN") throw new AppError(403, "La publicación directa requiere administrador")
  return members[0]
}

// 📚 El lock del destino mantiene estable la versión mientras cambia la imagen, el texto o el estado.
export async function lockDraft(tx: Prisma.TransactionClient, userId: number, teamId: number, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "AchievementDraft" WHERE "id" = ${id}::uuid AND "teamId" = ${teamId} FOR UPDATE`
  const row = await tx.achievementDraft.findFirst({ where: { id, userId, teamId } })
  if (!row) throw new AppError(404, "Borrador no encontrado")
  return row
}

// 📚 El DTO no expone assetId: solo el servidor puede trasladar una referencia de imagen.
export async function createDraft(userId: number, teamId: number, purpose: AchievementDraftPurpose, fields: z.infer<typeof draftFieldsSchema>, db: PrismaClient = prisma) {
  validatePurposeFields(purpose, fields)
  return db.$transaction(async tx => {
    await lockDraftOwner(tx, userId, teamId, purpose === "DIRECT")
    if (await tx.achievementDraft.count({ where: { userId, status: "DRAFT" } }) >= DRAFT_LIMIT) throw new AppError(409, "Ya tienes 3 borradores")
    return tx.achievementDraft.create({ data: { userId, teamId, purpose, fields }, select: draftSelect })
  })
}

// 📚 Preparar una propuesta no permite decidir puntos ni configuración reservada a su revisión administrativa.
function validatePurposeFields(purpose: AchievementDraftPurpose, fields: Record<string, unknown>) {
  if (purpose === "PROPOSAL" && Object.keys(fields).some(key => !["nombre", "descripcion", "criterios"].includes(key))) throw new AppError(400, "Una propuesta solo admite nombre, descripción y criterios")
}

// 📚 PATCH sustituye el documento editable completo, con versión obligatoria para evitar perder cambios de otra pestaña.
export async function updateDraft(userId: number, teamId: number, id: string, version: number, fields: z.infer<typeof draftFieldsSchema>, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    const member = await lockDraftOwner(tx, userId, teamId)
    const row = await lockDraft(tx, userId, teamId, id)
    if (row.status !== "DRAFT" || row.version !== version) throw new AppError(409, "La versión del borrador cambió")
    if (row.purpose === "DIRECT" && member.role !== "TEAM_ADMIN") throw new AppError(403, "La publicación directa requiere administrador")
    validatePurposeFields(row.purpose, fields)
    return tx.achievementDraft.update({ where: { id }, data: { fields, version: { increment: 1 } }, select: draftSelect })
  })
}

// 📚 HEAD de todas las variantes ocurre fuera de la transacción; después el commit exige la misma referencia READY.
export async function assertReadyImage(assetId: string | null, teamId: number, store: MediaPublicationStore, db: PrismaClient = prisma) {
  const asset = assetId ? await db.mediaAsset.findFirst({ where: { id: assetId, teamId, state: "READY" } }) : null
  if (!asset) throw new AppError(409, "Se requiere una imagen lista")
  const variants = z.array(mediaAssetVariantSchema).min(1).max(3).safeParse(asset.variants)
  if (!variants.success) throw new AppError(503, "La imagen no está disponible")
  try {
    for (const variant of variants.data) {
      if (!await headPrivateMediaImage(store, asset.id, variant, AbortSignal.timeout(30_000))) throw new AppError(409, "Faltan variantes de la imagen")
    }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(503, "No se pudo comprobar la imagen")
  }
  return asset.id
}

// 📚 Enviar es una transición única, no un create repetible: resultado, imagen y liberación de plaza comparten commit.
export async function submitDraft(userId: number, teamId: number, id: string, version: number, purpose: AchievementDraftPurpose, store: MediaPublicationStore, db: PrismaClient = prisma) {
  const snapshot = await db.achievementDraft.findFirst({ where: { id, userId, teamId } })
  const member = await db.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } })
  if (!member) throw new AppError(403, "No perteneces a este equipo")
  if (purpose === "DIRECT" && member.role !== "TEAM_ADMIN") throw new AppError(403, "La publicación directa requiere administrador")
  if (!snapshot) throw new AppError(404, "Borrador no encontrado")
  if (snapshot.purpose !== purpose) throw new AppError(409, "La finalidad del borrador no coincide")
  if (snapshot.status === "DRAFT") await assertReadyImage(snapshot.imageAssetId, teamId, store, db)
  return db.$transaction(async tx => {
    await lockDraftOwner(tx, userId, teamId, purpose === "DIRECT")
    const row = await lockDraft(tx, userId, teamId, id)
    if (row.purpose !== purpose) throw new AppError(409, "La finalidad del borrador no coincide")
    if (row.status === (purpose === "DIRECT" ? "PUBLISHED" : "SUBMITTED") && row.submittedVersion === version && row.resultId) {
      const result = purpose === "DIRECT" ? await tx.logro.findFirst({ where: { id: row.resultId, teamId } }) : await tx.propuestaLogro.findFirst({ where: { id: row.resultId, teamId, userId } })
      if (!result) throw new AppError(409, "El resultado ya no está disponible")
      return result
    }
    if (row.status !== "DRAFT" || row.version !== version || row.imageAssetId !== snapshot.imageAssetId) throw new AppError(409, "La versión del borrador cambió")
    await lockMediaJobCoordination(tx)
    if (await tx.mediaJob.count({ where: { activeResourceKey: imageTargetKey({ kind: "draft", teamId, id }) } })) throw new AppError(409, "Hay una sustitución de imagen activa")
    if (!row.imageAssetId || !await tx.mediaAsset.findFirst({ where: { id: row.imageAssetId, teamId, state: "READY" } })) throw new AppError(409, "Se requiere una imagen lista")
    const parsed = (purpose === "DIRECT" ? crearLogroSchema : crearPropuestaSchema).safeParse(row.fields)
    if (!parsed.success) throw new AppError(400, "Completa los campos del borrador antes de enviarlo")
    if (purpose === "PROPOSAL" && await tx.propuestaLogro.count({ where: { userId, teamId, status: "PENDING" } }) >= 5) throw new AppError(409, "Ya tienes 5 propuestas pendientes en este equipo")
    const imageAssetId = row.imageAssetId
    // 📚 Resultado y traslado de referencia comparten commit: ninguna lectura externa observa las referencias intermedias.
    const result = purpose === "DIRECT"
      ? await tx.logro.create({ data: { ...crearLogroSchema.parse(parsed.data), teamId, imageAssetId } })
      : await tx.propuestaLogro.create({ data: { ...crearPropuestaSchema.parse(parsed.data), teamId, userId, imageAssetId } })
    await tx.achievementDraft.update({ where: { id }, data: { imageAssetId: null, status: purpose === "DIRECT" ? "PUBLISHED" : "SUBMITTED", submittedVersion: version, resultId: result.id } })
    return result
  })
}

// 📚 El descarte confirma estado/cancelación y diario S3 antes de borrar; un worker tardío encuentra DISCARDED y no puede asociar.
export async function discardDraft(userId: number, teamId: number, id: string, version: number, db: PrismaClient = prisma) {
  return db.$transaction(async tx => {
    await lockDraftOwner(tx, userId, teamId)
    const row = await lockDraft(tx, userId, teamId, id)
    if (row.status === "DISCARDED" && row.version === version) return tx.achievementDraft.findUniqueOrThrow({ where: { id }, select: draftSelect })
    if (row.status !== "DRAFT" || row.version !== version) throw new AppError(409, "La versión del borrador cambió")
    await lockMediaJobCoordination(tx)
    await cancelActiveTargetJobs(tx, imageTargetKey({ kind: "draft", teamId, id }))
    await tx.achievementDraft.update({ where: { id }, data: { status: "DISCARDED", imageAssetId: null } })
    if (row.imageAssetId) {
      const asset = await tx.mediaAsset.findUniqueOrThrow({ where: { id: row.imageAssetId } })
      const variants = z.array(mediaAssetVariantSchema).min(1).max(3).parse(asset.variants)
      await tx.mediaAsset.update({ where: { id: asset.id }, data: { state: "RETIRED" } })
      await tx.mediaAssetCleanup.create({ data: { assetId: asset.id, keys: variants.map(v => v.key) } })
    }
    return tx.achievementDraft.findUniqueOrThrow({ where: { id }, select: draftSelect })
  })
}
