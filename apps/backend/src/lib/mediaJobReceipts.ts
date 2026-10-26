import { randomUUID } from "node:crypto"
import { basename, isAbsolute, resolve } from "node:path"
import { Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { imageKindSchema, type ImageKind } from "./mediaImageProtocol"
import { lockMediaJobCoordination } from "./mediaJobCoordination"
import { mediaUploadErrorCodeSchema } from "./mediaUploadProtocol"
import prisma from "./prisma"

function isJobDirectory(path: string, jobId: string): boolean {
  // 📚 Se valida la forma canónica de la ruta sin tocar disco dentro del módulo de dominio.
  return isAbsolute(path) && resolve(path) === path && basename(path) === jobId
}

export const mediaJobReceiptClaimSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.number().int().positive(),
  teamId: z.number().int().positive().nullable(),
  resourceKey: z.string().min(1).max(255),
  receiptToken: z.string().uuid(),
  startedAt: z.date(),
  inputDirectory: z.string().min(1).max(2048),
  imageKind: imageKindSchema,
}).strict().refine((claim) => isJobDirectory(claim.inputDirectory, claim.id))

export type MediaJobReceiptClaim = z.infer<typeof mediaJobReceiptClaimSchema>
type ReceiptDatabase = PrismaClient | Prisma.TransactionClient
type ReceiptIdentity = Pick<MediaJobReceiptClaim, "id" | "ownerId" | "teamId" | "resourceKey">

// 📚 Errores de persistencia no afirman que el CAS haya fallado: PostgreSQL pudo confirmar
// 📚 antes de que la conexión se interrumpiera, así que el caller conserva archivos y reserva.
function persistenceUnavailable(cause: unknown): AppError {
  const error = new AppError(503, "No se pudo guardar el estado de recepción")
  Object.defineProperty(error, "cause", { value: cause, enumerable: false })
  return error
}

// 📚 El token autoriza un intento y la hora sale de PostgreSQL; juntos atan ruta/kind
// 📚 a la admisión, pero el marcador no prueba por sí solo que el archivo se haya escrito.
export async function startMediaJobReceipt(
  identity: ReceiptIdentity,
  workspace: { inputDirectory: string; imageKind: ImageKind },
  db: ReceiptDatabase = prisma,
): Promise<MediaJobReceiptClaim> {
  const input = z.object({
    id: z.string().uuid(),
    ownerId: z.number().int().positive(),
    teamId: z.number().int().positive().nullable(),
    resourceKey: z.string().min(1).max(255),
    inputDirectory: z.string().min(1).max(2048),
    imageKind: imageKindSchema,
  }).strict().safeParse({ ...identity, ...workspace })
  if (!input.success) throw new AppError(400, "Los datos del recibo no son válidos")
  if (!isJobDirectory(input.data.inputDirectory, input.data.id)) throw new AppError(400, "Los datos del recibo no son válidos")

  const receiptToken = randomUUID()
  try {
    const started = await db.$queryRaw<Array<{ id: string; receiptStartedAt: Date }>>`
      WITH receipt_clock AS (
        SELECT clock_timestamp()::timestamp(3) AS started_at
      )
      UPDATE "MediaJob" AS job
      SET "receiptToken" = ${receiptToken}::uuid,
          "receiptStartedAt" = receipt_clock.started_at,
          "updatedAt" = receipt_clock.started_at,
          "inputDirectory" = ${input.data.inputDirectory},
          "imageKind" = ${input.data.imageKind}
      FROM receipt_clock
      WHERE job."id" = ${input.data.id}::uuid
        AND job."ownerId" = ${input.data.ownerId}
        AND job."teamId" IS NOT DISTINCT FROM ${input.data.teamId}::integer
        AND job."resourceKey" = ${input.data.resourceKey}
        AND job."status" = 'RECEIVING'::"MediaJobState"
        AND job."receiptToken" IS NULL
        AND job."receiptStartedAt" IS NULL
        AND job."inputDirectory" IS NULL
        AND job."imageKind" IS NULL
        AND job."executorStartedAt" IS NULL
      RETURNING job."id", job."receiptStartedAt"
    `
    if (!started[0]) throw new AppError(409, "El trabajo ya no está disponible para iniciar su recepción")
    return mediaJobReceiptClaimSchema.parse({
      ...input.data,
      receiptToken,
      startedAt: started[0].receiptStartedAt,
    })
  } catch (error) {
    if (error instanceof AppError) throw error
    throw persistenceUnavailable(error)
  }
}

// 📚 Solo el token que abrió RECEIVING puede liberar esa reserva; cleanupPendingDirectory
// 📚 admite únicamente el directorio exacto del claim para que no se persistan rutas arbitrarias.
export async function finishMediaJobReceipt(
  claim: MediaJobReceiptClaim,
  outcome: {
    status: "FAILED" | "CANCELED"
    failureCode: string
    cleanupPendingDirectory?: string
  },
  db: PrismaClient = prisma,
): Promise<void> {
  const parsedClaim = mediaJobReceiptClaimSchema.safeParse(claim)
  const parsedOutcome = z.object({
    status: z.enum(["FAILED", "CANCELED"]),
    failureCode: mediaUploadErrorCodeSchema,
    cleanupPendingDirectory: z.string().max(2048).optional(),
  }).strict().safeParse(outcome)
  if (!parsedClaim.success || !parsedOutcome.success
    || (parsedOutcome.data.cleanupPendingDirectory !== undefined
      && parsedOutcome.data.cleanupPendingDirectory !== parsedClaim.data.inputDirectory)) {
    throw new AppError(400, "El cierre del recibo no es válido")
  }

  let changed: Array<{ id: string }>
  try {
    changed = await db.$transaction(async (tx) => {
      await lockMediaJobCoordination(tx)
      return tx.$queryRaw<Array<{ id: string }>>`
        WITH receipt_clock AS (
          SELECT clock_timestamp()::timestamp(3) AS completed_at
        )
        UPDATE "MediaJob" AS job
        SET "status" = ${parsedOutcome.data.status}::"MediaJobState",
            "activeResourceKey" = NULL,
            "failureCode" = ${parsedOutcome.data.failureCode},
            "cleanupPendingDirectory" = ${parsedOutcome.data.cleanupPendingDirectory ?? null},
            "completedAt" = receipt_clock.completed_at,
            "updatedAt" = receipt_clock.completed_at
        FROM receipt_clock
        WHERE job."id" = ${parsedClaim.data.id}::uuid
          AND job."ownerId" = ${parsedClaim.data.ownerId}
          AND job."teamId" IS NOT DISTINCT FROM ${parsedClaim.data.teamId}::integer
          AND job."resourceKey" = ${parsedClaim.data.resourceKey}
          AND job."status" = 'RECEIVING'::"MediaJobState"
          AND job."receiptToken" = ${parsedClaim.data.receiptToken}::uuid
          AND job."receiptStartedAt" = ${parsedClaim.data.startedAt}::timestamp(3)
          AND job."inputDirectory" = ${parsedClaim.data.inputDirectory}
          AND job."imageKind" = ${parsedClaim.data.imageKind}
        RETURNING job."id"
      `
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 5_000,
      maxWait: 2_000,
    })
  } catch (error) {
    throw persistenceUnavailable(error)
  }
  if (changed.length !== 1) throw new AppError(409, "El recibo cambió antes de guardar su resultado")
}
