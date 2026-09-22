import type { AchievementScope, Prisma } from "@prisma/client"
import prisma from "./prisma"
import { AppError } from "../errors/AppError"

type DatabaseClient = typeof prisma | Prisma.TransactionClient

// 📚 Una sola función gobierna el contexto de escritura: las rutas no pueden discrepar
// 📚 sobre si un logro estacional pertenece a la temporada activa o debe rechazarse.
export async function awardSeasonId(db: DatabaseClient, teamId: number, scope: AchievementScope) {
  if (scope === "PERMANENT") return null

  const season = await db.season.findFirst({
    where: { teamId, status: "ACTIVE" },
    select: { id: true },
  })
  if (!season) throw new AppError(409, "Este equipo no tiene una temporada activa")
  return season.id
}

// 📚 El filtro combina el historial que nunca caduca con una sola edición estacional;
// 📚 si no hay temporada activa, el ranking actual contiene únicamente logros permanentes.
export function currentAwardsWhere(teamId: number, seasonId: number | null) {
  return {
    logro: { teamId },
    OR: [
      { logro: { scope: "PERMANENT" as const }, seasonId: null },
      ...(seasonId === null
        ? []
        : [{ logro: { scope: "SEASONAL" as const }, seasonId }]),
    ],
  }
}
