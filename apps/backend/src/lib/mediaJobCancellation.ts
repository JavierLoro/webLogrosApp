import { Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { parseImageTarget } from "./mediaTargets"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import prisma from "./prisma"

// 📚 Una selección cerrada evita que la API de cancelación filtre rutas, tokens o manifests internos.
const cancellationJobSelection = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  cancelRequestedAt: true,
  failureCode: true,
} satisfies Prisma.MediaJobSelect

export type MediaJobCancellationView = Prisma.MediaJobGetPayload<{ select: typeof cancellationJobSelection }>
export type MediaJobCancellationResult = {
  job: MediaJobCancellationView
  cancellation: "requested" | "canceled" | "too_late"
}

const cancellationInputSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.number().int().positive(),
  teamId: z.number().int().positive(),
}).strict()

const terminalStates = new Set(["SUCCEEDED", "FAILED", "INTERRUPTED"])

// 📚 La solicitud es durable y compite con la publicación bajo el mismo protocolo de locks;
// 📚 los estados activos conservan la reserva hasta que su escritor confirme cierre.
export async function requestMediaJobCancellation(
  input: { id: string; ownerId: number; teamId: number },
  db: PrismaClient = prisma,
): Promise<MediaJobCancellationResult> {
  const parsed = cancellationInputSchema.safeParse(input)
  if (!parsed.success) throw new AppError(400, "Los datos de cancelación no son válidos")

  try {
    return await db.$transaction(async (tx) => {
      // 📚 Bloquear primero la membresía conserva el mismo orden que publicación y serializa revocaciones del rol.
      const memberships = await tx.$queryRaw<Array<{ id: number; role: string }>>`
        SELECT "id", "role" FROM "TeamMembership"
        WHERE "userId" = ${parsed.data.ownerId} AND "teamId" = ${parsed.data.teamId}
        FOR UPDATE
      `
      if (memberships.length !== 1) {
        throw new AppError(403, "No perteneces a este equipo")
      }

      const snapshot = await tx.mediaJob.findFirst({ where: { id: parsed.data.id, ownerId: parsed.data.ownerId, teamId: parsed.data.teamId }, select: { resourceKey: true } })
      // 📚 Conservamos el 403 histórico para un PLAYER sin trabajo propio; no consultamos ni revelamos el destino ajeno.
      if (!snapshot && memberships[0].role !== "TEAM_ADMIN") throw new AppError(403, "No puedes cancelar este trabajo")
      const destination = snapshot ? parseImageTarget(snapshot.resourceKey) : null
      if (!destination || destination.teamId !== parsed.data.teamId) throw new AppError(404, "No se encontró el trabajo")
      if (destination.kind === "achievement" && memberships[0].role !== "TEAM_ADMIN") throw new AppError(403, "Solo un administrador puede cancelar este trabajo")
      // 📚 Cancelar un trabajo propio no requiere conservar el rol de creación directa; sí la membresía vigente.
      await lockMediaJobCoordination(tx)

      // 📚 El lock de fila vuelve a comprobar la identidad completa y hace estable el estado leído abajo.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM "MediaJob"
        WHERE "id" = ${parsed.data.id}::uuid
          AND "ownerId" = ${parsed.data.ownerId}
          AND "teamId" = ${parsed.data.teamId}
        FOR UPDATE
      `
      if (!locked[0]) throw new AppError(404, "No se encontró el trabajo")

      const job = await tx.mediaJob.findFirst({
        where: { id: parsed.data.id, ownerId: parsed.data.ownerId, teamId: parsed.data.teamId },
        select: { ...cancellationJobSelection, resourceKey: true },
      })
      if (!job) throw new AppError(404, "No se encontró el trabajo")

      // 📚 Solo los tres destinos reconocidos participan: una clave futura necesita su propia autorización contextual.
      const { resourceKey, ...safeJob } = job
      const target = parseImageTarget(resourceKey)
      if (!target || target.teamId !== parsed.data.teamId) throw new AppError(404, "No se encontró el trabajo")

      if (job.status === "CANCELED") return { job: safeJob, cancellation: "canceled" }
      if (terminalStates.has(job.status)) return { job: safeJob, cancellation: "too_late" }

      let updated: MediaJobCancellationView | null = null
      if (job.status === "QUEUED") {
        const rows = await tx.$queryRaw<MediaJobCancellationView[]>`
          WITH cancel_clock AS (
            SELECT clock_timestamp()::timestamp(3) AS canceled_at
          )
          UPDATE "MediaJob" AS job
          SET "cancelRequestedAt" = COALESCE(job."cancelRequestedAt", cancel_clock.canceled_at),
              "status" = 'CANCELED'::"MediaJobState",
              "activeResourceKey" = NULL,
              "failureCode" = 'CANCELED',
              "cleanupPendingDirectory" = job."inputDirectory",
              "completedAt" = cancel_clock.canceled_at,
              "updatedAt" = cancel_clock.canceled_at
          FROM cancel_clock
          WHERE job."id" = ${parsed.data.id}::uuid
            AND job."status" = 'QUEUED'::"MediaJobState"
          RETURNING job."id", job."status", job."createdAt", job."updatedAt",
                    job."completedAt", job."cancelRequestedAt", job."failureCode"
        `
        updated = rows[0] ?? null
      } else {
        const rows = await tx.$queryRaw<MediaJobCancellationView[]>`
          WITH cancel_clock AS (
            SELECT clock_timestamp()::timestamp(3) AS requested_at
          )
          UPDATE "MediaJob" AS job
          SET "cancelRequestedAt" = COALESCE(job."cancelRequestedAt", cancel_clock.requested_at),
              "updatedAt" = CASE WHEN job."cancelRequestedAt" IS NULL
                THEN cancel_clock.requested_at ELSE job."updatedAt" END
          FROM cancel_clock
          WHERE job."id" = ${parsed.data.id}::uuid
            AND job."status" IN ('RECEIVING'::"MediaJobState", 'PROCESSING'::"MediaJobState", 'PUBLISHING'::"MediaJobState")
          RETURNING job."id", job."status", job."createdAt", job."updatedAt",
                    job."completedAt", job."cancelRequestedAt", job."failureCode"
        `
        updated = rows[0] ?? null
      }

      if (!updated) throw new AppError(409, "El trabajo cambió antes de guardar la cancelación")
      return { job: updated, cancellation: updated.status === "CANCELED" ? "canceled" : "requested" }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 5_000,
      maxWait: 2_000,
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    // 📚 Perder el ACK no demuestra rollback: el cliente puede repetir la
    // 📚 cancelación idempotente, sin que afirmemos éxito o liberemos otro turno.
    const unavailable = new AppError(503, "No se pudo confirmar la cancelación de la imagen")
    Object.defineProperty(unavailable, "cause", { value: error, enumerable: false })
    throw unavailable
  }
}


// 📚 El caller ya posee el lock global: QUEUED no tiene escritor y se cierra ahora;
// 📚 los demás estados solo reciben intención hasta confirmar el cierre físico.
export async function cancelActiveTargetJobs(tx: Prisma.TransactionClient, resourceKey: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE "MediaJob" SET "cancelRequestedAt" = COALESCE("cancelRequestedAt", clock_timestamp()::timestamp(3)),
      "status" = 'CANCELED'::"MediaJobState", "activeResourceKey" = NULL, "failureCode" = 'CANCELED',
      "cleanupPendingDirectory" = "inputDirectory", "completedAt" = clock_timestamp()::timestamp(3), "updatedAt" = clock_timestamp()::timestamp(3)
    WHERE "activeResourceKey" = ${resourceKey} AND "status" = 'QUEUED'::"MediaJobState"`
  await tx.mediaJob.updateMany({ where: { activeResourceKey: resourceKey, cancelRequestedAt: null }, data: { cancelRequestedAt: new Date() } })
}
