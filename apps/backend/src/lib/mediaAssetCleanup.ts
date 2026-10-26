import { Prisma, PrismaClient } from "@prisma/client"
import { z } from "zod"
import { AppError } from "../errors/AppError"
import { parseImageTarget, imageObjectKey, imageReferenceCount } from "./mediaTargets"
import prisma from "./prisma"
import { mediaAssetVariantSchema } from "./mediaPublication"

export type MediaAssetCleanupStore = Pick<ObjectStorePort, "head" | "delete">
type ObjectStorePort = {
  head(key: string): Promise<{ contentType?: string; contentLength?: number; etag?: string } | null>
  delete(key: string): Promise<void>
}
type CleanupDatabase = PrismaClient

const cleanupIdSchema = z.string().uuid()

// 📚 Cada clave se vuelve a contrastar con el manifiesto duradero antes del borrado para que un registro corrupto no amplíe su alcance.
function cleanupKeysMatchAsset(
  keys: string[], variants: z.infer<typeof mediaAssetVariantSchema>[], resourceKey: string,
  teamId: number, jobId: string,
): boolean {
  const target = parseImageTarget(resourceKey)
  if (!target || target.teamId !== teamId) return false
  const expected = variants.map(({ filename }) =>
    imageObjectKey(target, jobId, filename)).sort()
  return keys.length === expected.length
    && [...keys].sort().every((key, index) => key === expected[index])
}

// 📚 La limpieza vive separada de la publicación porque borrar puede reintentarse con seguridad después de un fallo de red.
export async function cleanupMediaAssetCleanup(
  cleanupId: string,
  store: MediaAssetCleanupStore,
  db: CleanupDatabase = prisma,
): Promise<{ id: string; status: "PENDING" | "COMPLETE" }> {
  if (!cleanupIdSchema.safeParse(cleanupId).success) throw new AppError(400, "La limpieza del asset no es válida")
  const cleanup = await db.mediaAssetCleanup.findUnique({
    where: { id: cleanupId },
    include: {
      asset: { select: { id: true, teamId: true, state: true, variants: true, job: { select: { id: true, resourceKey: true } } } },
    },
  })
  if (!cleanup) throw new AppError(404, "No se encontró la limpieza del asset")

  const variantsResult = z.array(mediaAssetVariantSchema).min(1).max(3).safeParse(cleanup.asset.variants)
  if (cleanup.asset.state !== "RETIRED" || !variantsResult.success
    || !cleanupKeysMatchAsset(cleanup.keys, variantsResult.data, cleanup.asset.job.resourceKey, cleanup.asset.teamId, cleanup.asset.job.id)) {
    throw new AppError(409, "La limpieza no coincide con un asset retirado")
  }

  if (await imageReferenceCount(db, cleanup.assetId) > 0) {
    throw new AppError(409, "El asset sigue asociado a un logro")
  }

  if (cleanup.status === "COMPLETE") {
    let objectReappeared = false
    try {
      // 📚 Un PUT remoto puede terminar tarde después de una caída; revalidar HEAD permite retirar objetos que reaparezcan.
      for (const key of cleanup.keys) {
        if (await store.head(key) !== null) objectReappeared = true
      }
    } catch {
      // 📚 Si la revalidación remota falla, dejamos un retry durable sin asumir que el objeto falta.
      try {
        await db.mediaAssetCleanup.updateMany({
          where: { id: cleanupId, status: "COMPLETE" },
          data: { status: "PENDING", attempts: { increment: 1 }, lastErrorCode: "OBJECT_RECHECK_FAILED", completedAt: null },
        })
      } catch {
        throw new AppError(503, "No se pudo registrar el reintento de limpieza")
      }
      return { id: cleanupId, status: "PENDING" }
    }
    if (!objectReappeared) {
      // 📚 El timestamp funciona como cursor rotativo: los COMPLETE verificados más antiguos vuelven al final del barrido.
      const rotated = await db.mediaAssetCleanup.updateMany({
        where: { id: cleanupId, status: "COMPLETE" },
        data: { completedAt: new Date() },
      })
      if (rotated.count !== 1) {
        const latest = await db.mediaAssetCleanup.findUnique({ where: { id: cleanupId }, select: { status: true } })
        if (latest?.status !== "COMPLETE") return { id: cleanupId, status: "PENDING" }
      }
      return { id: cleanupId, status: "COMPLETE" }
    }
    const reset = await db.mediaAssetCleanup.updateMany({
      where: { id: cleanupId, status: "COMPLETE" },
      data: { status: "PENDING", completedAt: null, lastErrorCode: null },
    })
    if (reset.count !== 1) {
      const latest = await db.mediaAssetCleanup.findUnique({ where: { id: cleanupId }, select: { status: true } })
      if (latest?.status !== "PENDING") return { id: cleanupId, status: "COMPLETE" }
    }
  }

  try {
    // 📚 Una referencia viva bloquea el borrado aunque exista una fila de limpieza por error de coordinación.
    for (const key of cleanup.keys) {
      if (await store.head(key) === null) continue
      await store.delete(key)
      // 📚 DeleteObject es idempotente en S3, pero HEAD null confirma que la clave ya no existe tras el borrado.
      if (await store.head(key) !== null) throw new Error("OBJECT_REMAINS")
    }
    await db.mediaAssetCleanup.updateMany({
      where: { id: cleanupId, status: "PENDING" },
      data: { status: "COMPLETE", attempts: { increment: 1 }, lastErrorCode: null, completedAt: new Date() },
    })
    return { id: cleanupId, status: "COMPLETE" }
  } catch (error) {
    if (error instanceof AppError) throw error
    // 📚 El detalle del proveedor queda en logs del proceso; en BD se guarda un código estable para reintentar sin filtrar credenciales.
    try {
      await db.mediaAssetCleanup.updateMany({
        where: { id: cleanupId, status: "PENDING" },
        data: { attempts: { increment: 1 }, lastErrorCode: "OBJECT_CLEANUP_FAILED" },
      })
    } catch {
      throw new AppError(503, "No se pudo registrar el reintento de limpieza")
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new AppError(503, "No se pudo confirmar la limpieza del asset")
    }
    return { id: cleanupId, status: "PENDING" }
  }
}
