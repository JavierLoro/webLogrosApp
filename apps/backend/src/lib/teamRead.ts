import prisma from "./prisma"

// 📚 Un nombre ausente se representa sin revelar el email en las lecturas de miembros.
export function publicName(user: { id: number; displayName: string | null }) {
  return user.displayName?.trim() || `Miembro ${user.id}`
}

// 📚 Tres consultas para todo el equipo evitan N+1. El filtro del logro impide sumar puntos
// 📚 de otro tenant aunque un usuario pertenezca a ambos; los miembros sin asignación quedan a cero.
export async function readTeam(teamId: number) {
  const [memberships, catalog, awards] = await Promise.all([
    prisma.teamMembership.findMany({ where: { teamId }, select: { role: true, joinedAt: true, user: { select: { id: true, displayName: true } } } }),
    prisma.logro.findMany({ where: { teamId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
    prisma.userLogro.findMany({ where: { logro: { teamId }, user: { memberships: { some: { teamId } } } }, select: { id: true, userId: true, logroId: true, fecha: true }, orderBy: [{ fecha: "desc" }, { id: "desc" }] }),
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
  const players = memberships.map(({ user, role, joinedAt }) => {
    const earned = byUser.get(user.id) ?? []
    const latest = earned[0]
    return { id: user.id, displayName: publicName(user), role, joinedAt,
      puntos: earned.reduce((sum, award) => sum + byAchievement.get(award.logroId)!.puntos, 0),
      logrosCount: earned.length,
      ultimoLogro: latest ? { id: latest.logroId, nombre: byAchievement.get(latest.logroId)!.nombre, fecha: latest.fecha } : null }
  }).sort((a, b) => b.puntos - a.puntos || b.logrosCount - a.logrosCount || a.id - b.id)
    .map((player, index) => ({ ...player, position: index + 1 }))
  const totals = { members: players.length, catalog: catalog.length, awards: awards.length,
    points: players.reduce((sum, player) => sum + player.puntos, 0), uniqueEarned: holderCounts.size,
    participants: players.filter(player => player.logrosCount > 0).length }
  return { players, totals, catalog, awards, holderCounts, byUser }
}

// 📚 Añadimos metadatos sin cambiar las propiedades que ya consumía el catálogo.
export async function readCatalog(teamId: number, userId: number, id?: number) {
  const rows = await prisma.logro.findMany({ where: { teamId, ...(id === undefined ? {} : { id }) },
    include: { _count: { select: { obtenidos: { where: { user: { memberships: { some: { teamId } } } } } } }, obtenidos: { where: { userId }, select: { id: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }] })
  return rows.map(({ _count, obtenidos, ...logro }) => ({ ...logro, holdersCount: _count.obtenidos, earnedByMe: obtenidos.length > 0 }))
}
