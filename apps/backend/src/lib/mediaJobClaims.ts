import { randomUUID } from "node:crypto"
import { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "../errors/AppError"
import { expireQueuedMediaJobs, lockMediaJobCoordination } from "./mediaJobCoordination"
import prisma from "./prisma"

const CLAIM_TRANSACTION_TIMEOUT_MS = 5_000
const CLAIM_TRANSACTION_MAX_WAIT_MS = 2_000

// 📚 Prisma puede exponer UNIQUE como P2002 o envolver el índice SQL en P2010;
// 📚 filtramos por processingSlot para no ocultar otros conflictos de unicidad.
function isProcessingSlotConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false
  if (error.code === "P2002") {
    const target = error.meta?.target
    return target === "MediaJob_processingSlot_key"
      || (Array.isArray(target) && target.includes("processingSlot"))
  }
  if (error.code !== "P2010") return false
  const adapter = error.meta?.driverAdapterError as {
    cause?: { constraint?: { fields?: unknown } }
  } | undefined
  const fields = adapter?.cause?.constraint?.fields
  return Array.isArray(fields)
    && fields.some((field) => field === "processingSlot" || field === '"processingSlot"')
}

export type ClaimedMediaJob = {
  id: string
  ownerId: number
  teamId: number | null
  resourceKey: string
  slot: 1 | 2
  executionToken: string
  startedAt: Date
}

type ClaimedRow = {
  id: string
  ownerId: number
  teamId: number | null
  resourceKey: string
  slot: number
  executionToken: string
  startedAt: Date
}

// 📚 Serializar solo la decisión de capacidad hace atómica la cola y deja libre
// 📚 PostgreSQL antes de ejecutar trabajo CPU-bound, que pertenece a otro bloque.
export async function claimNextQueuedMediaJob(
  db: PrismaClient = prisma,
  runtimeOwnerId?: string,
): Promise<ClaimedMediaJob | null> {
  try {
    return await db.$transaction(async (tx) => {
      await lockMediaJobCoordination(tx)
      await expireQueuedMediaJobs(tx)

      const occupied = await tx.mediaJob.findMany({
        where: { status: { in: ["PROCESSING", "PUBLISHING"] } },
        select: { processingSlot: true },
      })
      const occupiedSlots = new Set(occupied.map(({ processingSlot }) => processingSlot))
      const slot = ([1, 2] as const).find((candidate) => !occupiedSlots.has(candidate))
      if (slot === undefined) return null

      // 📚 PostgreSQL define frontera y orden: la transferencia se considera llegada
      // 📚 al completar y el candidato debe seguir vivo al instante de la toma.
      const queued = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "MediaJob"
        WHERE "status" = 'QUEUED'::"MediaJobState"
          AND "cancelRequestedAt" IS NULL
          AND (${runtimeOwnerId ?? null}::uuid IS NULL OR "runtimeOwnerId" = ${runtimeOwnerId ?? null}::uuid)
          AND "queueExpiresAt" > clock_timestamp()::timestamp(3)
        ORDER BY "queuedAt" ASC, "id" ASC
        LIMIT 1
      `
      if (!queued[0]) {
        // 📚 Un turno puede vencer después del primer barrido; el segundo lo terminaliza
        // 📚 y hace commit de WAIT_TIMEOUT aunque ya no sea candidato para toma.
        await expireQueuedMediaJobs(tx)
        return null
      }

      const executionToken = randomUUID()
      // 📚 La transición condicional vuelve a comprobar QUEUED al escribir; así,
      // 📚 cambios ajenos al advisory lock fallan de forma segura y no se duplican.
      const updated = await tx.$queryRaw<ClaimedRow[]>`
        UPDATE "MediaJob"
        SET "status" = 'PROCESSING'::"MediaJobState",
            "processingSlot" = ${slot},
            "executionToken" = ${executionToken}::uuid,
            "processingStartedAt" = clock_timestamp()::timestamp(3),
            "updatedAt" = clock_timestamp()::timestamp(3)
        WHERE "id" = ${queued[0].id}::uuid
          AND "status" = 'QUEUED'::"MediaJobState"
          AND "cancelRequestedAt" IS NULL
          AND "queueExpiresAt" > clock_timestamp()::timestamp(3)
        RETURNING "id", "ownerId", "teamId", "resourceKey",
                  "processingSlot" AS "slot", "executionToken",
                  "processingStartedAt" AS "startedAt"
      `
      const claimed = updated[0]
      if (!claimed) {
        await expireQueuedMediaJobs(tx)
        const stillQueued = await tx.mediaJob.findFirst({
          where: { id: queued[0].id, status: "QUEUED" },
          select: { id: true },
        })
        if (!stillQueued) return null
        throw new AppError(409, "El trabajo ya no está disponible para toma")
      }

      return {
        id: claimed.id,
        ownerId: claimed.ownerId,
        teamId: claimed.teamId,
        resourceKey: claimed.resourceKey,
        slot: claimed.slot as 1 | 2,
        executionToken: claimed.executionToken,
        startedAt: claimed.startedAt,
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: CLAIM_TRANSACTION_TIMEOUT_MS,
      maxWait: CLAIM_TRANSACTION_MAX_WAIT_MS,
    })
  } catch (error) {
    // 📚 UNIQUE(processingSlot) también cubre escrituras ajenas al advisory lock;
    // 📚 presentamos solo ese conflicto de forma segura y no reintentamos.
    if (isProcessingSlotConflict(error)) {
      throw new AppError(409, "La capacidad de procesamiento cambió durante la toma")
    }
    throw error
  }
}
