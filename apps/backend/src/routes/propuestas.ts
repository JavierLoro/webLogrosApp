import express from "express"
import prisma from "../lib/prisma"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { validate } from "../middleware/validate"
import { AppError } from "../errors/AppError"
import { crearPropuestaSchema, aceptarPropuestaSchema } from "../schemas/propuestas"
import { rejectAchievementRequestSchema, requestStatusSchema } from "../schemas/achievementRequests"
import { publicName } from "../lib/teamRead"
import { hiddenAchievement, isAchievementHidden, presentAchievement, revealedAchievementIds } from "../lib/achievementVisibility"

// 📚 El router padre ya resuelve el tenant; mergeParams conserva slug sin volver a buscarlo.
const router = express.Router({ mergeParams: true })
// 📚 La membresía se filtra por el tenant ya autorizado: así el alias de otro equipo nunca
//    puede aparecer por accidente en una respuesta administrativa.
const adminInclude = (teamId: number) => ({ user: { select: { id: true, firstName: true, lastName: true, email: true, memberships: { where: { teamId }, select: { displayName: true }, take: 1 } } }, logro: true }) as const

function withContextualUser<T extends { user: { id: number; email: string; firstName: string | null; lastName: string | null; memberships: Array<{ displayName: string | null }> } }>(row: T) {
  const { user, ...proposal } = row
  return { ...proposal, user: { id: user.id, email: user.email, displayName: publicName({ displayName: user.memberships[0]?.displayName ?? null, user }) } }
}

// 📚 IDs positivos evitan consultas ambiguas; los filtros de tenant/autor se aplican además del ID.
function proposalId(value: string | string[]) {
  if (Array.isArray(value) || !/^\d+$/.test(value)) throw new AppError(400, "ID no válido")
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError(400, "ID no válido")
  return id
}

router.post("/propuestas", authMiddleware, requireTeamMember, validate(crearPropuestaSchema), async (req, res) => {
  // 📚 La identidad se toma del middleware, nunca de campos enviados por el navegador.
  const proposal = await prisma.propuestaLogro.create({ data: { ...req.body, teamId: req.team!.id, userId: req.userId! } })
  res.status(201).json(proposal)
})

router.get("/propuestas", authMiddleware, requireTeamMember, async (req, res) => {
  const rows = await prisma.propuestaLogro.findMany({ where: { teamId: req.team!.id, userId: req.userId }, include: { logro: true }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
  const revealed = await revealedAchievementIds(req.team!.id)
  res.json(rows.map(row => presentProposal(row, revealed, req.teamMembership!.role === "TEAM_ADMIN")))
})

// 📚 La propuesta conserva una copia del texto: censurar solo su relación logro dejaría
// 📚 escapar nombre y criterios por ese duplicado cuando el administrador lo convierte en secreto.
function presentProposal<T extends { id: number; logro: import("@prisma/client").Logro | null }>(row: T, revealed: Set<number>, admin: boolean) {
  if (row.logro && isAchievementHidden(row.logro, revealed, admin)) {
    return { id: row.id, isHidden: true, logro: hiddenAchievement(row.logro.id) }
  }
  return { ...row, logro: row.logro ? presentAchievement(row.logro, revealed, admin) : null }
}

// 📚 El detalle personal devuelve 404 también para otro autor: no revela su propuesta.
router.get("/propuestas/:id", authMiddleware, requireTeamMember, async (req, res) => {
  const proposal = await prisma.propuestaLogro.findFirst({ where: { id: proposalId(req.params.id), teamId: req.team!.id, userId: req.userId }, include: { logro: true } })
  if (!proposal) throw new AppError(404, "Propuesta no encontrada")
  res.json(presentProposal(proposal, await revealedAchievementIds(req.team!.id), req.teamMembership!.role === "TEAM_ADMIN"))
})

router.get("/admin/propuestas", authMiddleware, requireTeamAdmin, async (req, res) => {
  const status = requestStatusSchema.safeParse(req.query.status)
  if (!status.success) throw new AppError(400, "Estado de propuesta no válido")
  const proposals = await prisma.propuestaLogro.findMany({ where: { teamId: req.team!.id, ...(status.data === "all" ? {} : { status: status.data }) }, include: adminInclude(req.team!.id), orderBy: [{ createdAt: "asc" }, { id: "asc" }] })
  res.json(proposals.map(withContextualUser))
})

router.get("/admin/propuestas/:id", authMiddleware, requireTeamAdmin, async (req, res) => {
  const proposal = await prisma.propuestaLogro.findFirst({ where: { id: proposalId(req.params.id), teamId: req.team!.id }, include: adminInclude(req.team!.id) })
  if (!proposal) throw new AppError(404, "Propuesta no encontrada")
  res.json(withContextualUser(proposal))
})

router.post("/admin/propuestas/:id/aceptar", authMiddleware, requireTeamAdmin, validate(aceptarPropuestaSchema), async (req, res) => {
  const id = proposalId(req.params.id)
  // 📚 La transición y el catálogo se confirman juntos. Si falla crear el logro, PENDING se restaura.
  const proposal = await prisma.$transaction(async tx => {
    const pending = await tx.propuestaLogro.findFirst({ where: { id, teamId: req.team!.id } })
    if (!pending) throw new AppError(404, "Propuesta no encontrada")
    if (pending.status !== "PENDING") throw new AppError(409, "La propuesta ya fue procesada")
    // 📚 Compare-and-set bloquea la doble aprobación concurrente antes de crear el catálogo.
    const claimed = await tx.propuestaLogro.updateMany({ where: { id, teamId: req.team!.id, status: "PENDING" }, data: { status: "ACCEPTED", reviewedAt: new Date(), rejectionReason: null } })
    if (claimed.count !== 1) throw new AppError(409, "La propuesta ya fue procesada")
    const logro = await tx.logro.create({ data: { teamId: pending.teamId, nombre: pending.nombre, descripcion: pending.descripcion, criterios: pending.criterios, puntos: req.body.puntos, categoria: req.body.categoria, scope: req.body.scope, kind: req.body.kind, targetValue: req.body.targetValue, isSecret: req.body.isSecret } })
    // 📚 No se escribe UserLogro ni SolicitudLogro: la autoría no equivale a haber obtenido el logro.
    return tx.propuestaLogro.update({ where: { id }, data: { logroId: logro.id }, include: adminInclude(req.team!.id) })
  })
  res.json(withContextualUser(proposal))
})

router.post("/admin/propuestas/:id/rechazar", authMiddleware, requireTeamAdmin, validate(rejectAchievementRequestSchema), async (req, res) => {
  const id = proposalId(req.params.id)
  const existing = await prisma.propuestaLogro.findFirst({ where: { id, teamId: req.team!.id } })
  if (!existing) throw new AppError(404, "Propuesta no encontrada")
  // 📚 La condición PENDING impide que un rechazo tardío sobrescriba una aprobación concurrente.
  const changed = await prisma.propuestaLogro.updateMany({ where: { id, teamId: req.team!.id, status: "PENDING" }, data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: req.body.reason } })
  if (changed.count !== 1) throw new AppError(409, "La propuesta ya fue procesada")
  res.json(withContextualUser(await prisma.propuestaLogro.findUniqueOrThrow({ where: { id }, include: adminInclude(req.team!.id) })))
})

export default router
