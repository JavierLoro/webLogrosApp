import { IncomingHttpHeaders } from "node:http"
import { Readable } from "node:stream"
import { PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { receiveAndQueueMediaJob, type MediaUploadIntakeResult } from "./mediaUploadIntake"
import prisma from "./prisma"

const targetSchema = z.object({
  ownerId: z.number().int().positive(),
  teamId: z.number().int().positive(),
  achievementId: z.number().int().positive(),
}).strict()

// 📚 Una clave canónica representa el destino, no el archivo: dos administradores
// 📚 que sustituyen la misma imagen deben competir por la misma reserva UNIQUE.
export function achievementImageResourceKey(teamId: number, achievementId: number): string {
  if (!Number.isSafeInteger(teamId) || teamId <= 0
    || !Number.isSafeInteger(achievementId) || achievementId <= 0) {
    throw new AppError(400, "El destino de la imagen no es válido")
  }
  return `team:${teamId}:achievement:${achievementId}:image`
}

// 📚 La publicación vuelve a interpretar la clave creada por el servidor; nunca
// 📚 extrae IDs de un nombre de archivo ni acepta destinos de otro tipo por accidente.
export function parseAchievementImageResourceKey(key: string): { teamId: number; achievementId: number } | null {
  const match = /^team:([1-9]\d*):achievement:([1-9]\d*):image$/.exec(key)
  if (!match) return null
  const teamId = Number(match[1])
  const achievementId = Number(match[2])
  return Number.isSafeInteger(teamId) && Number.isSafeInteger(achievementId) ? { teamId, achievementId } : null
}

// 📚 Esta fachada conserva el contrato del catálogo; borradores y subsanación usan
// 📚 mediaTargets al admitir, porque TEAM_ADMIN no es una regla de toda imagen.
export async function receiveAchievementImage(
  source: Readable,
  headers: IncomingHttpHeaders,
  targetInput: unknown,
  options: { temporaryRoot: string; signal?: AbortSignal },
  db: PrismaClient = prisma,
): Promise<MediaUploadIntakeResult> {
  if (!(source instanceof Readable)) throw new AppError(400, "La fuente de imagen no es válida")
  // 📚 Se escucha antes de consultar DB: un error temprano del stream no debe
  // 📚 convertirse en un evento sin manejador mientras se comprueba el permiso.
  let sourceFailed = false
  const onError = (): void => { sourceFailed = true }
  source.on("error", onError)
  try {
    const parsed = targetSchema.safeParse(targetInput)
    if (!parsed.success) throw new AppError(400, "El destino de la imagen no es válido")
    const target = parsed.data
    const achievement = await db.logro.findFirst({
      where: { id: target.achievementId, teamId: target.teamId }, select: { id: true },
    })
    if (!achievement) throw new AppError(404, "No se encontró el logro")
    const membership = await db.teamMembership.findUnique({
      where: { userId_teamId: { userId: target.ownerId, teamId: target.teamId } }, select: { role: true },
    })
    if (membership?.role !== "TEAM_ADMIN") throw new AppError(403, "Solo el administrador del equipo puede sustituir esta imagen")
    if (sourceFailed) throw new AppError(400, "La fuente de imagen no está disponible")
    return await receiveAndQueueMediaJob(source, headers, {
      ownerId: target.ownerId,
      teamId: target.teamId,
      resourceKey: achievementImageResourceKey(target.teamId, target.achievementId),
      imageKind: "achievement",
    }, options, db)
  } catch (error) {
    // 📚 Rechazar antes de admitir también cierra la fuente; no reservamos un job
    // 📚 ni dejamos una transferencia abierta para alguien sin permiso.
    if (!source.closed) {
      const closed = new Promise<void>((resolveClosed) => source.once("close", resolveClosed))
      source.destroy()
      await closed
    }
    if (error instanceof AppError) throw error
    const unavailable = new AppError(503, "No se pudo recibir la imagen del logro")
    Object.defineProperty(unavailable, "cause", { value: error, enumerable: false })
    throw unavailable
  } finally {
    source.removeListener("error", onError)
  }
}
