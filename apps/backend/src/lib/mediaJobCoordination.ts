import { Prisma } from "@prisma/client"

// 📚 Un mismo lock por transacción hace que admisión y toma vean la capacidad global
// 📚 en un único orden, aunque lleguen por conexiones o procesos distintos.
const MEDIA_JOB_LOCK_NAMESPACE = 7_100
const MEDIA_JOB_LOCK_KEY = 1

// 📚 Los números fijos forman parte del protocolo entre operaciones; no deben depender
// 📚 de datos del usuario porque todos los destinos comparten la misma capacidad.
export async function lockMediaJobCoordination(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$queryRaw<Array<{ locked: string }>>`
    SELECT pg_advisory_xact_lock(${MEDIA_JOB_LOCK_NAMESPACE}, ${MEDIA_JOB_LOCK_KEY})::text AS locked
  `
}

// 📚 La espera incluye solo transferencias y trabajos listos; los estados activos
// 📚 de procesamiento conservan sus dos puestos separados.
export function countWaitingMediaJobs(
  tx: Prisma.TransactionClient,
): Promise<number> {
  return tx.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } })
}

// 📚 La expiración solo toca QUEUED: RECEIVING puede corresponder a un stream activo
// 📚 y no se debe liberar su plaza hasta que el receptor confirme cierre físico.
export async function expireQueuedMediaJobs(
  tx: Prisma.TransactionClient,
): Promise<number> {
  const expired = await tx.$queryRaw<Array<{ id: string }>>`
    UPDATE "MediaJob"
    SET "status" = 'FAILED'::"MediaJobState",
        "activeResourceKey" = NULL,
        "failureCode" = 'WAIT_TIMEOUT',
        "cleanupPendingDirectory" = COALESCE("cleanupPendingDirectory", "inputDirectory"),
        "completedAt" = clock_timestamp()::timestamp(3),
        "updatedAt" = clock_timestamp()::timestamp(3)
    WHERE "status" = 'QUEUED'::"MediaJobState"
      AND "queueExpiresAt" <= clock_timestamp()::timestamp(3)
    RETURNING "id"
  `
  return expired.length
}
