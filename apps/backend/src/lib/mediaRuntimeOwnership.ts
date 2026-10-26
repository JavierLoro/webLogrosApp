import { randomUUID } from "node:crypto"
import { hostname } from "node:os"
import { Client } from "pg"
import type { PrismaClient } from "@prisma/client"
import { DATABASE_URL } from "../config/env"
import { AppError } from "../errors/AppError"

const ADVISORY_LOCK_NAMESPACE = 7100
const ADVISORY_LOCK_KEY = 2
const RECOVERABLE_STATES = ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] as const

export type MediaRuntimeOwnerRecord = {
  id: string
  hostId: string
  processId: number
  temporaryRoot: string
  startedAt: Date
  closedAt: Date | null
}

export type MediaRuntimeOwnership = {
  readonly owner: MediaRuntimeOwnerRecord
  readonly previousOwners: readonly MediaRuntimeOwnerRecord[]
  onLockLost(callback: () => void): void
  closeGracefully(): Promise<void>
}

type OwnershipOptions = {
  db: PrismaClient
  temporaryRoot: string
  connectionString?: string
  // 📚 Identidad inyectable solo en este helper permite probar escenarios de
  // 📚 recuperación sin falsificar la identidad que anuncia el runtime real.
  hostId?: string
  processId?: number
}

// 📚 El advisory lock vive en una conexión PostgreSQL dedicada: mientras esa
// 📚 sesión siga sana, ningún segundo proceso puede reclamar la misma cola.
export async function acquireMediaRuntimeOwnership(options: OwnershipOptions): Promise<MediaRuntimeOwnership> {
  // 📚 Prisma y el lock usan el mismo connection string ya validado por config/env;
  // 📚 los tests pueden inyectar su propia URL de base sin cambiar el runtime real.
  const client = new Client({
    connectionString: options.connectionString ?? DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
    statement_timeout: 5_000,
  })
  let lockHeld = false
  let closePromise: Promise<void> | null = null
  let lockLost = false
  const lockLossCallbacks = new Set<() => void>()
  const db = options.db

  try {
    await client.connect()
    const markLockLost = () => {
      if (!lockHeld || lockLost) return
      lockHeld = false
      lockLost = true
      for (const callback of lockLossCallbacks) {
        try { callback() } catch { /* Un callback de cierre no debe emitir un error sin manejar. */ }
      }
    }
    client.on("error", markLockLost)
    client.on("end", markLockLost)
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock($1, $2) AS locked",
      [ADVISORY_LOCK_NAMESPACE, ADVISORY_LOCK_KEY],
    )
    if (result.rows[0]?.locked !== true) {
      throw new AppError(503, "Ya existe otro runtime multimedia conectado a esta base de datos")
    }
    lockHeld = true

    const hostId = options.hostId ?? hostname()
    const processId = options.processId ?? process.pid
    const activeJobs = await db.mediaJob.findMany({
      where: { status: { in: [...RECOVERABLE_STATES] } },
      select: {
        status: true,
        runtimeOwnerId: true,
        runtimeOwner: {
          select: { id: true, hostId: true, processId: true, temporaryRoot: true, startedAt: true, closedAt: true },
        },
      },
    })
    const previousOwners = new Map<string, MediaRuntimeOwnerRecord>()
    for (const job of activeJobs) {
      const previous = job.runtimeOwner
      // 📚 Los registros legacy no prueban qué proceso dejó el stream abierto;
      // 📚 fallar cerrado evita que un restart robe trabajo de dueño desconocido.
      if (!job.runtimeOwnerId || !previous) {
        // 📚 Aunque QUEUED no tenga un worker activo, los claims solo seleccionan
        // 📚 filas asignadas al owner actual; no atribuimos legacy por inferencia.
        throw new AppError(503, "Hay trabajos multimedia activos sin propietario recuperable")
      }
      if (previous.hostId !== hostId) {
        throw new AppError(503, "Hay trabajos multimedia activos en otro host; recuperación bloqueada")
      }
      if (previous.temporaryRoot !== options.temporaryRoot) {
        throw new AppError(503, "Hay trabajos multimedia activos en otro directorio temporal; recuperación bloqueada")
      }
      if (!previous.closedAt && isProcessAlive(previous.processId)) {
        throw new AppError(503, "Hay un proceso multimedia anterior todavía activo; recuperación bloqueada")
      }
      previousOwners.set(previous.id, previous)
    }

    // 📚 Los trabajos terminales pueden conservar limpieza pendiente en S3 o disco;
    // 📚 también incluimos owners cerrados/muertos aunque ya no tengan trabajos activos.
    const allOwners = await db.mediaRuntimeOwner.findMany({
      select: { id: true, hostId: true, processId: true, temporaryRoot: true, startedAt: true, closedAt: true },
    })
    for (const previous of allOwners) {
      if (previous.closedAt || (previous.hostId === hostId && !isProcessAlive(previous.processId))) {
        if (previous.hostId !== hostId || previous.temporaryRoot !== options.temporaryRoot) continue
        previousOwners.set(previous.id, previous)
      }
    }

    if (!lockHeld || lockLost) throw new AppError(503, "Se perdió el bloqueo exclusivo del runtime multimedia")

    const owner = await db.mediaRuntimeOwner.create({
      data: { id: randomUUID(), hostId, processId, temporaryRoot: options.temporaryRoot },
    })

    return {
      owner,
      previousOwners: [...previousOwners.values()],
      onLockLost(callback) {
        lockLossCallbacks.add(callback)
        if (lockLost) {
          try { callback() } catch { /* Fallo cerrado sin emitir promesas sin manejar. */ }
        }
      },
      closeGracefully() {
        if (closePromise) return closePromise
        closePromise = (async () => {
          if (lockHeld && !lockLost) {
            let closeError: unknown
            try {
              const closed = await db.mediaRuntimeOwner.updateMany({
                where: { id: owner.id, closedAt: null },
                data: { closedAt: new Date() },
              })
              if (closed.count !== 1) closeError = new AppError(503, "No se pudo cerrar el registro del runtime multimedia")
            } catch (error) {
              closeError = error
            } finally {
              try {
                await client.query("SELECT pg_advisory_unlock($1, $2)", [ADVISORY_LOCK_NAMESPACE, ADVISORY_LOCK_KEY])
              } catch (error) {
                if (!closeError) closeError = error
              } finally {
                lockHeld = false
                try { await client.end() } catch (error) { if (!closeError) closeError = error }
              }
            }
            if (closeError) throw closeError
          } else {
            try { await client.end() } catch { /* La sesión perdió conexión; no marcar como cerrado. */ }
          }
        })()
        return closePromise
      },
    }
  } catch (error) {
    if (lockHeld) {
      try { await client.query("SELECT pg_advisory_unlock($1, $2)", [ADVISORY_LOCK_NAMESPACE, ADVISORY_LOCK_KEY]) } catch { /* cierra sesión abajo */ }
    }
    try { await client.end() } catch { /* preserva el error original */ }
    throw error
  }
}

// 📚 ESRCH demuestra que el PID no existe localmente; EPERM y cualquier otro
// 📚 error se consideran vivos/desconocidos para no recuperar un worker a ciegas.
function isProcessAlive(processId: number): boolean {
  try {
    process.kill(processId, 0)
    return true
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "ESRCH")
  }
}
