import express from "express"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { validate } from "../middleware/validate"
import { createSeasonSchema } from "../schemas/seasons"
import { readTeam } from "../lib/teamRead"

const router = express.Router({ mergeParams: true })

function seasonId(value: string | string[]) {
  if (Array.isArray(value) || !/^\d+$/.test(value)) throw new AppError(400, "ID no válido")
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new AppError(400, "ID no válido")
  return id
}

// 📚 La lista es visible para miembros porque las temporadas son contexto del ranking,
// 📚 no configuración secreta; el teamId de la URL mantiene el aislamiento tenant.
router.get("/temporadas", authMiddleware, requireTeamMember, async (req, res) => {
  res.json(await prisma.season.findMany({
    where: { teamId: req.team!.id },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
  }))
})

// 📚 Una lectura histórica reutiliza exactamente la misma suma que el ranking actual,
// 📚 cambiando solo la temporada seleccionada y conservando los logros permanentes.
router.get("/temporadas/:id/ranking", authMiddleware, requireTeamMember, async (req, res) => {
  const result = await readTeam(req.team!.id, seasonId(req.params.id))
  if (!result) throw new AppError(404, "Temporada no encontrada")
  res.json({ season: result.season, players: result.players, totals: result.totals })
})

router.post("/admin/temporadas", authMiddleware, requireTeamAdmin, validate(createSeasonSchema), async (req, res) => {
  const duplicate = await prisma.season.findUnique({
    where: { teamId_name: { teamId: req.team!.id, name: req.body.name } },
  })
  if (duplicate) throw new AppError(409, "Ya existe una temporada con ese nombre")
  res.status(201).json(await prisma.season.create({ data: { ...req.body, teamId: req.team!.id } }))
})

// 📚 Activar es una transición transaccional: cierra la edición anterior y activa la nueva
// 📚 como una sola operación. El índice parcial protege además frente a carreras concurrentes.
router.post("/admin/temporadas/:id/activar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = seasonId(req.params.id)
  const activated = await prisma.$transaction(async tx => {
    const target = await tx.season.findFirst({ where: { id, teamId: req.team!.id } })
    if (!target) throw new AppError(404, "Temporada no encontrada")
    if (target.status === "CLOSED") throw new AppError(409, "Una temporada cerrada no puede reactivarse")
    if (target.status === "ACTIVE") return target

    await tx.season.updateMany({
      where: { teamId: req.team!.id, status: "ACTIVE" },
      data: { status: "CLOSED" },
    })
    return tx.season.update({ where: { id }, data: { status: "ACTIVE" } })
  })
  res.json(activated)
})

router.post("/admin/temporadas/:id/cerrar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = seasonId(req.params.id)
  const changed = await prisma.season.updateMany({
    where: { id, teamId: req.team!.id, status: "ACTIVE" },
    data: { status: "CLOSED" },
  })
  if (changed.count !== 1) throw new AppError(409, "La temporada no está activa")
  res.json(await prisma.season.findUniqueOrThrow({ where: { id } }))
})

export default router
