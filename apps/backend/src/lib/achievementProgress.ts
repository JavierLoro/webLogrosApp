import type { Prisma } from "@prisma/client"
import prisma from "./prisma"
import { AppError } from "../errors/AppError"
import { progressDTO } from "./achievementProgressState"
import { awardSeasonId } from "./seasonContext"

// 📚 Una cerradura transaccional para el par jugador/logro coordina correcciones y concesiones:
// 📚 evita validar el objetivo mientras otra petición está reduciendo el mismo contador.
export async function lockAchievementProgress(tx: Prisma.TransactionClient, logroId: number, userId: number) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${logroId}::integer, ${userId}::integer)`
}

// 📚 Todas las concesiones comparten la misma cerradura y comprobación tenant, tanto
// 📚 la asignación directa como aprobar una solicitud. La concesión nunca sale del progreso.
export async function grantAchievement(tx: Prisma.TransactionClient, teamId: number, logroId: number, userId: number, seasonId: number | null) {
  await lockAchievementProgress(tx, logroId, userId)
  const [logro, membership, existing] = await Promise.all([
    tx.logro.findFirst({ where: { id: logroId, teamId } }),
    tx.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } }),
    tx.userLogro.findFirst({ where: { userId, logroId, seasonId } }),
  ])
  if (!logro || !membership) throw new AppError(404, "Jugador o logro no encontrado en este equipo")
  if (existing) throw new AppError(409, "Este jugador ya tiene el logro en este periodo")
  if (logro.scope === "PERMANENT" && seasonId !== null) throw new AppError(409, "Un logro permanente no pertenece a una temporada")
  if (logro.scope === "SEASONAL" && (seasonId === null || !await tx.season.findFirst({ where: { id: seasonId, teamId } }))) {
    throw new AppError(409, "Temporada no válida para este equipo")
  }
  if (logro.kind === "PROGRESSIVE") {
    const progress = await tx.achievementProgress.findFirst({ where: { userId, logroId, seasonId } })
    if (logro.targetValue === null || (progress?.currentValue ?? 0) < logro.targetValue) {
      throw new AppError(409, "El jugador debe alcanzar el objetivo antes de recibir el logro")
    }
  }
  return tx.userLogro.create({ data: { userId, logroId, seasonId } })
}

export async function readAchievementProgress(teamId: number, logroId: number, userId: number) {
  const [logro, membership] = await Promise.all([
    prisma.logro.findFirst({ where: { id: logroId, teamId } }),
    prisma.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } }),
  ])
  if (!logro || !membership) throw new AppError(404, "Jugador o logro no encontrado en este equipo")
  if (logro.kind !== "PROGRESSIVE" || logro.targetValue === null) return null
  const season = logro.scope === "SEASONAL" ? await prisma.season.findFirst({ where: { teamId, status: "ACTIVE" } }) : null
  const seasonId = season?.id ?? null
  if (logro.scope === "SEASONAL" && !season) return progressDTO(0, Number(logro.targetValue), null, false)
  const [progress, award] = await Promise.all([
    prisma.achievementProgress.findFirst({ where: { userId, logroId, seasonId } }),
    prisma.userLogro.findFirst({ where: { userId, logroId, seasonId } }),
  ])
  return progressDTO(Number(progress?.currentValue ?? 0), Number(logro.targetValue), seasonId, Boolean(award))
}

// 📚 ON CONFLICT suma contra la fila que PostgreSQL acaba de bloquear, no contra una copia
// 📚 leída antes en JavaScript. LEAST/GREATEST aplican el límite dentro de la misma escritura.
export async function persistProgressDelta(tx: Prisma.TransactionClient, logroId: number, userId: number, seasonId: number | null, target: number, delta: number) {
    if (seasonId === null) {
      await tx.$executeRaw`
        INSERT INTO "AchievementProgress" ("userId", "logroId", "seasonId", "currentValue", "updatedAt")
        VALUES (${userId}, ${logroId}, NULL, LEAST(${target}, GREATEST(0, ${delta})), CURRENT_TIMESTAMP)
        ON CONFLICT ("userId", "logroId") WHERE "seasonId" IS NULL
        DO UPDATE SET "currentValue" = LEAST(${target}, GREATEST(0, "AchievementProgress"."currentValue"::bigint + ${delta}::bigint)), "updatedAt" = CURRENT_TIMESTAMP`
    } else {
      await tx.$executeRaw`
        INSERT INTO "AchievementProgress" ("userId", "logroId", "seasonId", "currentValue", "updatedAt")
        VALUES (${userId}, ${logroId}, ${seasonId}, LEAST(${target}, GREATEST(0, ${delta})), CURRENT_TIMESTAMP)
        ON CONFLICT ("userId", "logroId", "seasonId") WHERE "seasonId" IS NOT NULL
        DO UPDATE SET "currentValue" = LEAST(${target}, GREATEST(0, "AchievementProgress"."currentValue"::bigint + ${delta}::bigint)), "updatedAt" = CURRENT_TIMESTAMP`
    }
    const updated = await tx.achievementProgress.findFirstOrThrow({ where: { userId, logroId, seasonId } })
    return updated
}

// 📚 La suma usa bigint temporalmente para que dos enteros grandes no desborden antes del clamp.
// 📚 El cierre tras conceder se comprueba bajo la misma cerradura que grantAchievement.
export async function applyProgressDelta(teamId: number, logroId: number, userId: number, delta: number) {
  return prisma.$transaction(async tx => {
    await lockAchievementProgress(tx, logroId, userId)
    const [logro, membership] = await Promise.all([
      tx.logro.findFirst({ where: { id: logroId, teamId } }),
      tx.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId } } }),
    ])
    if (!logro || !membership) throw new AppError(404, "Jugador o logro no encontrado en este equipo")
    if (logro.kind !== "PROGRESSIVE" || logro.targetValue === null) throw new AppError(409, "Este logro no admite progreso parcial")
    const seasonId = await awardSeasonId(tx, teamId, logro.scope)
    if (await tx.userLogro.findFirst({ where: { userId, logroId, seasonId } })) {
      throw new AppError(409, "El contador está cerrado porque el jugador ya tiene el logro")
    }
    const updated = await persistProgressDelta(tx, logroId, userId, seasonId, logro.targetValue, delta)
    return progressDTO(updated.currentValue, logro.targetValue, seasonId, false)
  })
}
