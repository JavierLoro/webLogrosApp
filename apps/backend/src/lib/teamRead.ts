import prisma from "./prisma"
import { currentAwardsWhere } from "./seasonContext"

type TenantIdentity = {
  displayName: string | null
  user: { id: number; firstName: string | null; lastName: string | null }
}

// 📚 La identidad contextual tiene una única regla para todas las lecturas tenant: el alias
//    de la membresía gana; después se usa el nombre global y nunca se filtra el email.
export function publicName({ displayName, user }: TenantIdentity) {
  const fullName = [user.firstName, user.lastName].map(part => part?.trim()).filter(Boolean).join(" ")
  return displayName?.trim() || fullName || `Miembro ${user.id}`
}

// 📚 Tres consultas para todo el equipo evitan N+1. El filtro del logro impide sumar puntos
// 📚 de otro tenant aunque un usuario pertenezca a ambos; los miembros sin asignación quedan a cero.
export async function readTeam(teamId: number, requestedSeasonId?: number) {
  const season = requestedSeasonId === undefined
    ? await prisma.season.findFirst({ where: { teamId, status: "ACTIVE" } })
    : await prisma.season.findFirst({ where: { id: requestedSeasonId, teamId } })
  if (requestedSeasonId !== undefined && !season) return null

  const [memberships, catalog, awards] = await Promise.all([
    prisma.teamMembership.findMany({ where: { teamId }, select: { displayName: true, role: true, joinedAt: true, user: { select: { id: true, firstName: true, lastName: true } } } }),
    prisma.logro.findMany({ where: { teamId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.userLogro.findMany({ where: { ...currentAwardsWhere(teamId, season?.id ?? null), user: { memberships: { some: { teamId } } } }, select: { id: true, userId: true, logroId: true, seasonId: true, fecha: true }, orderBy: [{ fecha: "desc" }, { id: "desc" }] }),
  ])
  const byAchievement = new Map(catalog.map(logro => [logro.id, logro]))
  const byUser = new Map<number, typeof awards>()
  const holderCounts = new Map<number, number>()
  for (const award of awards) {
    const rows = byUser.get(award.userId) ?? []
    rows.push(award)
    byUser.set(award.userId, rows)
    holderCounts.set(award.logroId, (holderCounts.get(award.logroId) ?? 0) + 1)
  }
  const players = memberships.map(({ user, displayName, role, joinedAt }) => {
    const earned = byUser.get(user.id) ?? []
    const latest = earned[0]
    return { id: user.id, displayName: publicName({ displayName, user }), role, joinedAt,
      puntos: earned.reduce((sum, award) => sum + byAchievement.get(award.logroId)!.puntos, 0),
      logrosCount: earned.length,
      ultimoLogro: latest ? { id: latest.logroId, nombre: byAchievement.get(latest.logroId)!.nombre, fecha: latest.fecha } : null }
  }).sort((a, b) => b.puntos - a.puntos || b.logrosCount - a.logrosCount || a.id - b.id)
    .map((player, index) => ({ ...player, position: index + 1 }))
  const totals = { members: players.length, catalog: catalog.length, awards: awards.length,
    points: players.reduce((sum, player) => sum + player.puntos, 0), uniqueEarned: holderCounts.size,
    participants: players.filter(player => player.logrosCount > 0).length }
  return { season, players, totals, catalog, awards, holderCounts, byUser }
}

// 📚 Añadimos metadatos sin cambiar las propiedades que ya consumía el catálogo.
export async function readCatalog(teamId: number, userId: number, id?: number) {
  const season = await prisma.season.findFirst({ where: { teamId, status: "ACTIVE" } })
  const [rows, awards] = await Promise.all([
    prisma.logro.findMany({ where: { teamId, ...(id === undefined ? {} : { id }) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.userLogro.findMany({ where: { ...currentAwardsWhere(teamId, season?.id ?? null), user: { memberships: { some: { teamId } } } }, select: { userId: true, logroId: true } }),
  ])
  const holders = new Map<number, number>()
  for (const award of awards) holders.set(award.logroId, (holders.get(award.logroId) ?? 0) + 1)
  return rows.map(logro => ({ ...logro, holdersCount: holders.get(logro.id) ?? 0, earnedByMe: awards.some(award => award.logroId === logro.id && award.userId === userId) }))
}
