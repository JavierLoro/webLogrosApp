import { Prisma, PrismaClient } from "@prisma/client"
import { AppError } from "../errors/AppError"
import { RegisterMediaJobInput, registerReceivingMediaJob, MediaJobView } from "./mediaJobs"
import { mediaJobReceiptClaimSchema, type MediaJobReceiptClaim } from "./mediaJobReceipts"
import {
  countWaitingMediaJobs,
  expireQueuedMediaJobs,
  lockMediaJobCoordination,
} from "./mediaJobCoordination"
import prisma from "./prisma"
import { parseImageTarget, lockImageTarget } from "./mediaTargets"

const WAITING_MEDIA_JOB_LIMIT = 10
const ADMISSION_TRANSACTION_TIMEOUT_MS = 5_000
const ADMISSION_TRANSACTION_MAX_WAIT_MS = 2_000

type AdmissionResult =
  | { kind: "ADMITTED"; job: MediaJobView }
  | { kind: "FULL" }
  | { kind: "DESTINATION_BUSY" }

// 📚 Un error al confirmar QUEUED no prueba rollback: el caller debe conservar el
// 📚 input hasta reconciliar la DB; la causa técnica no forma parte del DTO público.
function receiptPersistenceUnavailable(cause: unknown): AppError {
  const error = new AppError(503, "No se pudo guardar el estado de recepción")
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}

// 📚 Este punto único cuenta y reserva bajo el mismo lock global que la toma;
// 📚 así una carrera no admite un puesto 11 durante la transferencia.
export async function admitReceivingMediaJob(
  input: RegisterMediaJobInput,
  db: PrismaClient = prisma,
): Promise<MediaJobView> {
  // 📚 La validación fail-fast protege también a los llamadores internos; una ruta futura
  // 📚 deberá validar su JSON antes de llegar a esta frontera de dominio.
  if (!Number.isInteger(input.ownerId) || input.ownerId <= 0
    || (input.teamId !== undefined && (!Number.isInteger(input.teamId) || input.teamId <= 0))
    || typeof input.resourceKey !== "string" || input.resourceKey.trim().length === 0 || input.resourceKey.length > 255) {
    throw new AppError(400, "Los datos de admisión del trabajo no son válidos")
  }

  let result: AdmissionResult
  try {
    result = await db.$transaction(async (tx): Promise<AdmissionResult> => {
      const target = parseImageTarget(input.resourceKey)
      if (target && target.kind !== "achievement") await lockImageTarget(tx, target, input.ownerId)
      await lockMediaJobCoordination(tx)
      // 📚 Los QUEUED vencidos se hacen terminales antes de contar, y el retorno discriminado
      // 📚 permite confirmar esa limpieza incluso cuando después la admisión resulte llena.
      await expireQueuedMediaJobs(tx)

      const duplicate = await tx.mediaJob.findFirst({
        where: { activeResourceKey: input.resourceKey },
        select: { id: true },
      })
      if (duplicate) return { kind: "DESTINATION_BUSY" }

      if (await countWaitingMediaJobs(tx) >= WAITING_MEDIA_JOB_LIMIT) {
        return { kind: "FULL" }
      }

      // 📚 Registro low-level reutiliza el UNIQUE del destino como última barrera
      // 📚 frente a escrituras antiguas que todavía no usen el lock común.
      const job = await registerReceivingMediaJob(input, tx)
      return { kind: "ADMITTED", job }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: ADMISSION_TRANSACTION_TIMEOUT_MS,
      maxWait: ADMISSION_TRANSACTION_MAX_WAIT_MS,
    })
  } catch (error) {
    // 📚 Prisma puede abortar la transacción tras UNIQUE; se traduce fuera del tx
    // 📚 para no intentar continuar una conexión PostgreSQL ya marcada como fallida.
    if (error instanceof AppError && error.statusCode === 409) {
      throw new AppError(409, "Ya hay un trabajo de imagen activo para este destino")
    }
    throw error
  }

  // 📚 Los errores salen después del COMMIT para no deshacer la expiración de QUEUED.
  if (result.kind === "FULL") throw new AppError(503, "La cola de imágenes está completa")
  if (result.kind === "DESTINATION_BUSY") throw new AppError(409, "Ya hay un trabajo de imagen activo para este destino")
  return result.job
}

// 📚 Solo el token emitido al comenzar el recibo puede encolarlo después del cierre físico;
// 📚 un booleano aislado no basta para probar qué llamada recibió este archivo.
export async function markMediaJobQueuedAfterClosedReceipt(
  input: { claim: MediaJobReceiptClaim; receiverConfirmedClosed: true },
  db: PrismaClient = prisma,
): Promise<MediaJobView> {
  const claim = mediaJobReceiptClaimSchema.safeParse(input?.claim)
  // 📚 La comprobación runtime conserva el cierre como precondición aunque un consumidor
  // 📚 ignore TypeScript; el token/fecha/ruta/kind atan el CAS a la recepción abierta.
  if (input?.receiverConfirmedClosed !== true || !claim.success) {
    throw new AppError(400, "La confirmación de recepción no es válida")
  }
  const receipt = claim.data

  let job: MediaJobView[]
  try {
    job = await db.$transaction(async (tx) => {
      await lockMediaJobCoordination(tx)
      // 📚 Un reintento no debe revivir ni devolver como vigente una plaza que ya venció;
      // 📚 el barrido se confirma aunque la respuesta 409 se construya después del COMMIT.
      await expireQueuedMediaJobs(tx)

      // 📚 Una sola lectura de clock_timestamp fija inicio y fin de espera, sin reloj del servidor Node.
      const transitioned = await tx.$queryRaw<MediaJobView[]>`
      WITH receipt_clock AS (
        SELECT clock_timestamp()::timestamp(3) AS queued_at
      )
      UPDATE "MediaJob" AS job
      SET "status" = 'QUEUED'::"MediaJobState",
          "inputDirectory" = ${receipt.inputDirectory},
          "imageKind" = ${receipt.imageKind},
          "queuedAt" = receipt_clock.queued_at,
          "queueExpiresAt" = receipt_clock.queued_at + INTERVAL '180 seconds',
          "updatedAt" = receipt_clock.queued_at
      FROM receipt_clock
      WHERE job."id" = ${receipt.id}::uuid
        AND job."ownerId" = ${receipt.ownerId}
        AND job."teamId" IS NOT DISTINCT FROM ${receipt.teamId}::integer
        AND job."resourceKey" = ${receipt.resourceKey}
        AND job."status" = 'RECEIVING'::"MediaJobState"
        AND job."receiptToken" = ${receipt.receiptToken}::uuid
        AND job."receiptStartedAt" = ${receipt.startedAt}::timestamp(3)
        AND job."inputDirectory" = ${receipt.inputDirectory}
        AND job."imageKind" = ${receipt.imageKind}
        AND job."cancelRequestedAt" IS NULL
      RETURNING job."id", job."status", job."createdAt", job."updatedAt",
                job."completedAt", job."failureCode"
      `
      if (transitioned[0]) return transitioned

      // 📚 Si se pidió cancelar mientras el stream escribía, el cierre físico confirmado
      // 📚 ya permite liberar la reserva sin abrir una ventana para que el escritor siga activo.
      const canceledAfterReceiptClose = await tx.$queryRaw<MediaJobView[]>`
        WITH receipt_clock AS (
          SELECT clock_timestamp()::timestamp(3) AS completed_at
        )
        UPDATE "MediaJob" AS job
        SET "status" = 'CANCELED'::"MediaJobState",
            "activeResourceKey" = NULL,
            "failureCode" = 'CANCELED',
            "cleanupPendingDirectory" = job."inputDirectory",
            "completedAt" = receipt_clock.completed_at,
            "updatedAt" = receipt_clock.completed_at
        FROM receipt_clock
        WHERE job."id" = ${receipt.id}::uuid
          AND job."ownerId" = ${receipt.ownerId}
          AND job."teamId" IS NOT DISTINCT FROM ${receipt.teamId}::integer
          AND job."resourceKey" = ${receipt.resourceKey}
          AND job."status" = 'RECEIVING'::"MediaJobState"
          AND job."cancelRequestedAt" IS NOT NULL
          AND job."receiptToken" = ${receipt.receiptToken}::uuid
          AND job."receiptStartedAt" = ${receipt.startedAt}::timestamp(3)
          AND job."inputDirectory" = ${receipt.inputDirectory}
          AND job."imageKind" = ${receipt.imageKind}
        RETURNING job."id", job."status", job."createdAt", job."updatedAt",
                  job."completedAt", job."failureCode"
      `
      if (canceledAfterReceiptClose[0]) return canceledAfterReceiptClose

      // 📚 Repetir el acuse del mismo claim mientras sigue QUEUED devuelve el estado
      // 📚 existente sin renovar sus 180 s; un token viejo no puede confirmar otro archivo.
      const alreadyQueued = await tx.mediaJob.findFirst({
        where: {
          id: receipt.id,
          ownerId: receipt.ownerId,
          teamId: receipt.teamId,
          resourceKey: receipt.resourceKey,
          status: "QUEUED",
          receiptToken: receipt.receiptToken,
          receiptStartedAt: receipt.startedAt,
          inputDirectory: receipt.inputDirectory,
          imageKind: receipt.imageKind,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          failureCode: true,
        },
      })
      if (alreadyQueued) return [alreadyQueued]

      // 📚 El mismo claim reintentado tras el cierre devuelve CANCELED, nunca un QUEUED
      // 📚 ficticio ni un error que pudiera empujar al caller a reabrir la recepción.
      const alreadyCanceled = await tx.mediaJob.findFirst({
        where: {
          id: receipt.id,
          ownerId: receipt.ownerId,
          teamId: receipt.teamId,
          resourceKey: receipt.resourceKey,
          status: "CANCELED",
          receiptToken: receipt.receiptToken,
          receiptStartedAt: receipt.startedAt,
          inputDirectory: receipt.inputDirectory,
          imageKind: receipt.imageKind,
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          completedAt: true,
          failureCode: true,
        },
      })
      return alreadyCanceled ? [alreadyCanceled] : transitioned
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: ADMISSION_TRANSACTION_TIMEOUT_MS,
      maxWait: ADMISSION_TRANSACTION_MAX_WAIT_MS,
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw receiptPersistenceUnavailable(error)
  }

  if (!job[0]) throw new AppError(409, "El trabajo ya no está disponible para completar la recepción")
  return job[0]
}
