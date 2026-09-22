import type { Logro, Prisma } from "@prisma/client"
import prisma from "./prisma"

// 📚 El desbloqueo mira TODAS las concesiones del tenant, no solo la temporada activa:
// 📚 al cambiar de temporada nunca vuelve a esconderse un logro ya descubierto.
export const visibleAchievementWhere = {
  OR: [{ isSecret: false }, { obtenidos: { some: {} } }],
} satisfies Prisma.LogroWhereInput

export async function revealedAchievementIds(teamId: number) {
  const rows = await prisma.logro.findMany({
    where: { teamId, obtenidos: { some: {} } }, select: { id: true },
  })
  return new Set(rows.map(row => row.id))
}

export function isAchievementHidden(logro: Pick<Logro, "id" | "isSecret">, revealed: Set<number>, admin = false) {
  return !admin && logro.isSecret && !revealed.has(logro.id)
}

// 📚 Lista permitida, no spread y borrado: un futuro campo sensible queda oculto por defecto.
export function hiddenAchievement(id: number) {
  return { id, isSecret: true as const, isHidden: true as const }
}

export function presentAchievement<T extends Pick<Logro, "id" | "isSecret">>(logro: T, revealed: Set<number>, admin = false) {
  if (isAchievementHidden(logro, revealed, admin)) return hiddenAchievement(logro.id)
  return { ...logro, isHidden: false as const, isRevealed: !logro.isSecret || revealed.has(logro.id) }
}
