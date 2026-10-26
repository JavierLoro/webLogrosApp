import { Prisma } from "@prisma/client"
import { AppError } from "../errors/AppError"

export type ImageTarget = { teamId: number } & (
  { kind: "achievement"; id: number } | { kind: "draft"; id: string } | { kind: "proposal"; id: number }
)

// 📚 El destino lógico es independiente de Sharp: los tres recorridos procesan las mismas variantes de logro.
export function imageTargetKey(target: ImageTarget): string {
  const id = target.kind === "draft" ? target.id.toLowerCase() : target.id
  return `team:${target.teamId}:${target.kind}:${id}:image`
}

// 📚 El UUID se normaliza: distintas mayúsculas no pueden reservar dos veces el mismo borrador.
export function parseImageTarget(key: string): ImageTarget | null {
  const match = /^team:([1-9]\d*):(achievement|draft|proposal):([^:]+):image$/.exec(key)
  if (!match || !Number.isSafeInteger(Number(match[1]))) return null
  const teamId = Number(match[1])
  if (match[2] === "draft") {
    return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(match[3])
      ? { teamId, kind: "draft", id: match[3].toLowerCase() } : null
  }
  const id = Number(match[3])
  return /^[1-9]\d*$/.test(match[3]) && Number.isSafeInteger(id)
    ? { teamId, kind: match[2] as "achievement" | "proposal", id } : null
}

// 📚 Las claves conservan su origen tras transferir la referencia: no se copian objetos ni se renombran claves históricas.
export function imageObjectKey(target: ImageTarget, jobId: string, filename: string): string {
  const folder = target.kind === "achievement" ? "achievements" : target.kind === "draft" ? "drafts" : "proposals"
  return `media/teams/${target.teamId}/${folder}/${target.id}/jobs/${jobId}/${filename}`
}

// 📚 Orden común membership → destino → coordinación global. Admisión y commit usan los mismos locks que envío y descarte.
export async function lockImageTarget(tx: Prisma.TransactionClient, target: ImageTarget, userId: number): Promise<string | null> {
  const members = await tx.$queryRaw<Array<{ role: string }>>`
    SELECT "role" FROM "TeamMembership" WHERE "userId" = ${userId} AND "teamId" = ${target.teamId} FOR UPDATE`
  if (!members[0]) throw new AppError(403, "No perteneces a este equipo")
  if (target.kind === "achievement") {
    if (members[0].role !== "TEAM_ADMIN") throw new AppError(403, "Solo un administrador puede modificar esta imagen")
    await tx.$queryRaw`SELECT "id" FROM "Logro" WHERE "id" = ${target.id} AND "teamId" = ${target.teamId} FOR UPDATE`
    const row = await tx.logro.findFirst({ where: { id: target.id, teamId: target.teamId } })
    if (!row) throw new AppError(404, "Logro no encontrado")
    return row.imageAssetId
  }
  if (target.kind === "draft") {
    await tx.$queryRaw`SELECT "id" FROM "AchievementDraft" WHERE "id" = ${target.id}::uuid AND "teamId" = ${target.teamId} FOR UPDATE`
    const row = await tx.achievementDraft.findFirst({ where: { id: target.id, teamId: target.teamId, userId } })
    if (!row) throw new AppError(404, "Borrador no encontrado")
    if (row.status !== "DRAFT") throw new AppError(409, "El borrador ya no se puede editar")
    if (row.purpose === "DIRECT" && members[0].role !== "TEAM_ADMIN") throw new AppError(403, "La publicación directa requiere administrador")
    return row.imageAssetId
  }
  await tx.$queryRaw`SELECT "id" FROM "PropuestaLogro" WHERE "id" = ${target.id} AND "teamId" = ${target.teamId} FOR UPDATE`
  const row = await tx.propuestaLogro.findFirst({ where: { id: target.id, teamId: target.teamId, userId } })
  if (!row) throw new AppError(404, "Propuesta no encontrada")
  if (row.status !== "PENDING" || !row.imageRepairAllowed || row.imageAssetId) throw new AppError(409, "La propuesta no admite una imagen")
  return row.imageAssetId
}

// 📚 Una referencia de cualquiera de los tres modelos protege los bytes incluso si el asset cambió de destino.
export async function imageReferenceCount(db: Pick<Prisma.TransactionClient, "logro" | "achievementDraft" | "propuestaLogro">, id: string): Promise<number> {
  return await db.logro.count({ where: { imageAssetId: id } })
    + await db.achievementDraft.count({ where: { imageAssetId: id } })
    + await db.propuestaLogro.count({ where: { imageAssetId: id } })
}
