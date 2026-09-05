import express from "express"
import { Prisma } from "@prisma/client"
import prisma from "../lib/prisma"
import { authMiddleware } from "../middleware/auth"
import { AppError } from "../errors/AppError"
import { hashInvitationToken } from "../lib/invitationToken"

const router = express.Router()

router.get("/preview", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : ""
  const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hashInvitationToken(token) }, include: { team: { select: { slug: true, nombre: true } } } })
  if (!invitation || invitation.revokedAt || invitation.expiresAt <= new Date() || invitation.uses >= invitation.maxUses) throw new AppError(404, "La invitación no es válida o ha caducado")
  res.json({ team: invitation.team, expiresAt: invitation.expiresAt, remainingUses: invitation.maxUses - invitation.uses })
})

router.post("/join", authMiddleware, async (req, res) => {
  const { token } = req.body as { token?: string }
  if (!token?.trim()) throw new AppError(400, "El token de invitación es obligatorio")
  const cleanToken = token.trim()
  const tokenHash = hashInvitationToken(cleanToken)
  let membership
  // 📚 Serializable + reintento: dos personas pueden canjear el último uso al mismo tiempo.
  //    La transacción vuelve a comprobar el cupo y PostgreSQL aborta una de las carreras.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      membership = await prisma.$transaction(async (tx) => {
        const invitation = await tx.teamInvitation.findUnique({ where: { tokenHash } })
        if (!invitation || invitation.revokedAt || invitation.expiresAt <= new Date()) throw new AppError(400, "La invitación no es válida o ha caducado")
        const existing = await tx.teamMembership.findUnique({ where: { userId_teamId: { userId: req.userId!, teamId: invitation.teamId } } })
        if (existing) return existing
        // 📚 updateMany con `uses < maxUses` es un compare-and-set SQL atómico: solo una
        //    transacción puede convertir el último cupo de 0 disponible a 1 consumido.
        const consumed = await tx.teamInvitation.updateMany({
          where: { id: invitation.id, revokedAt: null, expiresAt: { gt: new Date() }, uses: { lt: invitation.maxUses } },
          data: { uses: { increment: 1 } },
        })
        if (consumed.count !== 1) throw new AppError(400, "La invitación no es válida o ha caducado")
        return tx.teamMembership.create({ data: { userId: req.userId!, teamId: invitation.teamId, role: "PLAYER" } })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
      break
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002")
      if (!retryable || attempt === 2) throw error
    }
  }
  if (!membership) throw new AppError(400, "No se pudo completar la unión")
  const team = await prisma.team.findUniqueOrThrow({ where: { id: membership.teamId }, select: { slug: true, nombre: true } })
  res.status(201).json({ team, role: membership.role })
})

export default router
