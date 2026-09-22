import express from "express"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { readAchievementProgress, applyProgressDelta } from "../lib/achievementProgress"
import { validate } from "../middleware/validate"
import { progressDeltaSchema } from "../schemas/logros"
import { isAchievementHidden, revealedAchievementIds } from "../lib/achievementVisibility"

const router = express.Router({ mergeParams: true })

// 📚 Tanto params como query son entrada no fiable: no aceptamos arrays, exponentes ni IDs fuera de PostgreSQL Int.
function positiveId(value: unknown) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) throw new AppError(400, "ID no válido")
  const id = Number(value)
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) throw new AppError(400, "ID no válido")
  return id
}

router.get("/logros/:id/progreso", authMiddleware, requireTeamMember, async (req, res) => {
  const logroId = positiveId(req.params.id)
  const userId = req.query.userId === undefined ? req.userId! : positiveId(req.query.userId)
  const admin = req.teamMembership!.role === "TEAM_ADMIN"
  if (userId !== req.userId && !admin) throw new AppError(403, "Solo puedes consultar tu propio progreso")
  const logro = await prisma.logro.findFirst({ where: { id: logroId, teamId: req.team!.id } })
  if (!logro) throw new AppError(404, "Logro no encontrado")
  // 📚 Censuramos antes de leer el contador: ni el objetivo ni el estado revelan criterios secretos.
  if (isAchievementHidden(logro, await revealedAchievementIds(req.team!.id), admin)) {
    res.json({ isHidden: true })
    return
  }
  res.json(await readAchievementProgress(req.team!.id, logroId, userId))
})

router.patch("/logros/:id/progreso", authMiddleware, requireTeamAdmin, validate(progressDeltaSchema), async (req, res) => {
  res.json(await applyProgressDelta(req.team!.id, positiveId(req.params.id), req.body.userId, req.body.delta))
})

export default router
