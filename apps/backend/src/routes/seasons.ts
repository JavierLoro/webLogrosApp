import express from "express"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { validate } from "../middleware/validate"
import { createSeasonSchema } from "../schemas/seasons"
import { readTeam } from "../lib/teamRead"

const router = express.Router({ mergeParams: true })

// 📚 Rechazamos IDs ambiguos antes de consultar: Number por sí solo aceptaría formatos
// 📚 como notación exponencial y no garantiza que el entero sea seguro.
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

// 📚 La restricción única de BD decide también cuando dos administradores crean a la vez;
// 📚 consultar primero no elimina esa carrera. P2002 se traduce a conflicto de negocio.
router.post("/admin/temporadas", authMiddleware, requireTeamAdmin, validate(createSeasonSchema), async (req, res) => {
  try {
    const { name, startsAt, endsAt } = req.body
    const created = await prisma.season.create({ data: { name, startsAt, endsAt, teamId: req.team!.id } })
    res.status(201).json(created)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Ya existe una temporada con ese nombre")
    }
    throw error
  }
})

// 📚 El equipo es el punto común incluso si dos peticiones apuntan a temporadas distintas.
// 📚 FOR UPDATE serializa sus transiciones antes de leer el estado; el parámetro SQL evita
// 📚 interpolar texto del cliente y el bloqueo se libera al terminar la transacción.
async function lockTeam(tx: Prisma.TransactionClient, teamId: number) {
  const rows = await tx.$queryRaw<Array<{ id: number }>>`SELECT "id" FROM "Team" WHERE "id" = ${teamId} FOR UPDATE`
  if (rows.length !== 1) throw new AppError(404, "Equipo no encontrado")
}

// 📚 Activar es una transición transaccional: cierra la edición anterior y activa la nueva
// 📚 como una sola operación. El índice parcial protege además frente a carreras concurrentes.
router.post("/admin/temporadas/:id/activar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = seasonId(req.params.id)
  const activated = await prisma.$transaction(async tx => {
    await lockTeam(tx, req.team!.id)
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

// 📚 Cerrar comparte el candado de activar: nunca puede intercalarse entre la lectura
// 📚 PLANNED y la escritura ACTIVE. Una temporada ajena es 404; un estado inválido, 409.
router.post("/admin/temporadas/:id/cerrar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = seasonId(req.params.id)
  const closed = await prisma.$transaction(async tx => {
    await lockTeam(tx, req.team!.id)
    const target = await tx.season.findFirst({ where: { id, teamId: req.team!.id } })
    if (!target) throw new AppError(404, "Temporada no encontrada")
    if (target.status !== "ACTIVE") throw new AppError(409, "La temporada no está activa")
    return tx.season.update({ where: { id }, data: { status: "CLOSED" } })
  })
  res.json(closed)
})

export default router
