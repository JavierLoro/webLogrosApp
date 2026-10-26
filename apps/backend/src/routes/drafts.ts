import express from "express"
import { z } from "zod"
import { authMiddleware } from "../middleware/auth"
import { requireTeamMember } from "../middleware/teamAccess"
import { requireMediaOrigin } from "../middleware/mediaOrigin"
import { validate } from "../middleware/validate"
import { AppError } from "../errors/AppError"
import { draftCreateSchema, draftUpdateSchema, draftVersionSchema } from "../schemas/drafts"
import { createDraft, updateDraft, discardDraft, draftSelect, DRAFT_LIMIT } from "../lib/achievementDrafts"
import { getMediaRuntime } from "../lib/mediaRuntime"
import prisma from "../lib/prisma"

// 📚 Solo los metadatos agregados de borradores inaccesibles salen de esta consulta global; nunca sus equipos ni IDs.
export const globalDraftsRouter = express.Router()
globalDraftsRouter.use("/borradores", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next() })
globalDraftsRouter.get("/borradores", authMiddleware, async (req, res) => {
  res.setHeader("Cache-Control", "no-store")
  const userId = req.userId!
  const result = await prisma.$transaction(async tx => {
    // 📚 El snapshot repetible mantiene coherentes el total y la lista aunque otra pestaña libere una plaza.
    const memberships = await tx.teamMembership.findMany({ where: { userId }, select: { teamId: true } })
    const rows = await tx.achievementDraft.findMany({ where: { userId, status: "DRAFT", teamId: { in: memberships.map(m => m.teamId) } }, select: { ...draftSelect, team: { select: { slug: true, nombre: true } } }, orderBy: { createdAt: "desc" } })
    const total = await tx.achievementDraft.count({ where: { userId, status: "DRAFT" } })
    return { borradores: rows, totalOcupado: total, limite: DRAFT_LIMIT, inaccesibles: total - rows.length }
  }, { isolationLevel: "RepeatableRead" })
  res.json(result)
})

const router = express.Router({ mergeParams: true })
router.use("/borradores", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next() }, authMiddleware, requireTeamMember)
// 📚 Validar antes de convertir a uuid SQL mantiene los errores de entrada en 400, sin filtrar errores de PostgreSQL.
function uuid(value: unknown): string {
  const parsed = z.string().uuid().safeParse(value)
  if (!parsed.success) throw new AppError(400, "ID de borrador no válido")
  return parsed.data.toLowerCase()
}
router.post("/borradores", requireMediaOrigin, validate(draftCreateSchema), async (req, res) => {
  res.status(201).json(await createDraft(req.userId!, req.team!.id, req.body.purpose, req.body.fields))
})
router.get("/borradores", async (req, res) => {
  res.json(await prisma.achievementDraft.findMany({ where: { userId: req.userId!, teamId: req.team!.id, status: "DRAFT" }, select: draftSelect, orderBy: { createdAt: "desc" } }))
})
router.get("/borradores/:id", async (req, res) => {
  const row = await prisma.achievementDraft.findFirst({ where: { id: uuid(req.params.id), userId: req.userId!, teamId: req.team!.id }, select: draftSelect })
  if (!row) throw new AppError(404, "Borrador no encontrado")
  // 📚 Los textos terminales no son otro historial: una aprobación puede haber convertido el logro en secreto.
  res.json(row.status === "DRAFT" ? row : { ...row, fields: {} })
})
router.patch("/borradores/:id", requireMediaOrigin, validate(draftUpdateSchema), async (req, res) => {
  res.json(await updateDraft(req.userId!, req.team!.id, uuid(req.params.id), req.body.version, req.body.fields))
})
router.post("/borradores/:id/descartar", requireMediaOrigin, validate(draftVersionSchema), async (req, res) => {
  res.json(await discardDraft(req.userId!, req.team!.id, uuid(req.params.id), req.body.version))
  getMediaRuntime()?.wake()
})
export default router
