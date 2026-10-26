import assert from "node:assert/strict"
import { Readable } from "node:stream"
import { setTimeout as delay } from "node:timers/promises"
import { Prisma, PrismaClient } from "@prisma/client"
import sharp from "sharp"
import { z } from "zod"
import { DATABASE_URL } from "../config/env"
import { receiveAndQueueMediaJob } from "../lib/mediaUploadIntake"
import { imageTargetKey } from "../lib/mediaTargets"
import { receiveAchievementImage } from "../lib/mediaAchievementTarget"
import { createMediaRuntime } from "../lib/mediaRuntime"
import { createObjectStoreFromEnv } from "../lib/objectStore"
import prisma from "../lib/prisma"
import type { executeMediaImage as ExecuteMediaImage } from "../lib/mediaImageExecutor"

const inputSchema = z.object({
  stage: z.enum(["receiving", "queued", "processing", "publishing", "committed"]),
  temporaryRoot: z.string(), ownerId: z.number().int().positive(), teamId: z.number().int().positive(),
  achievementId: z.number().int().positive().optional(),
  draftId: z.string().uuid().optional(),
  proposalId: z.number().int().positive().optional(),
}).strict().refine(value => [value.achievementId, value.draftId, value.proposalId].filter(v => v !== undefined).length === 1)

// 📚 Este actor solo existe para provocar una caída REAL en una base aislada.
// 📚 No registra rutas ni se importa desde el servidor de producto.
async function run(raw: unknown): Promise<void> {
  assert.equal(process.env.MEDIA_RECOVERY_CRASH_PROBE, "1")
  const database = new URL(DATABASE_URL)
  assert.equal(database.hostname, "127.0.0.1")
  assert.equal(database.port, "55437")
  assert.equal(database.pathname, "/weblogros_ui")
  const input = inputSchema.parse(raw)
  assert.ok(process.send)
  let runtimeOwnerId = ""
  const reached = (stage: string, pid?: number): void => {
    process.send!({ stage, runtimeOwnerId, pid })
  }
  if (input.stage === "queued") {
    const claims = require("../lib/mediaJobClaims") as typeof import("../lib/mediaJobClaims")
    claims.claimNextQueuedMediaJob = async () => null
  }
  if (input.stage === "processing") {
    const module = require("../lib/mediaImageExecutor") as { executeMediaImage: typeof ExecuteMediaImage }
    const execute = module.executeMediaImage
    module.executeMediaImage = (request, options = {}) => execute(request, {
      ...options,
      onPhase(event) {
        options.onPhase?.(event)
        if (event.phase === "started") {
          reached("processing", event.pid)
          // 📚 Congelamos al padre después del inicio, no al hijo Sharp. El test
          // 📚 mata este proceso y el hijo debe salir por desconexión IPC.
          Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0)
        }
      },
    })
  }
  let databaseClient = prisma
  if (input.stage === "committed") {
    databaseClient = new Proxy(prisma, {
      get(target, property) {
        if (property === "$transaction") return async (callback: unknown, ...rest: unknown[]) => {
          if (typeof callback !== "function") return Reflect.apply(target.$transaction, target, [callback, ...rest])
          let committed = false
          const result = await Reflect.apply(target.$transaction, target, [async (tx: Prisma.TransactionClient) => {
            const proxy = new Proxy(tx, { get(transaction, field) {
              if (field === "mediaJob") return new Proxy(transaction.mediaJob, { get(delegate, method) {
                if (method === "updateMany") return async (args: Prisma.MediaJobUpdateManyArgs) => {
                  const value = await delegate.updateMany(args)
                  if (args.data.status === "SUCCEEDED") committed = true
                  return value
                }
                const value = Reflect.get(delegate, method, delegate)
                return typeof value === "function" ? value.bind(delegate) : value
              } })
              const value = Reflect.get(transaction, field, transaction)
              return typeof value === "function" ? value.bind(transaction) : value
            } })
            return callback(proxy)
          }, ...rest])
          if (committed) { reached("committed"); await new Promise<void>(() => {}) }
          return result
        }
        const value = Reflect.get(target, property, target)
        return typeof value === "function" ? value.bind(target) : value
      },
    }) as PrismaClient
  }
  const store = createObjectStoreFromEnv()
  let firstPut = true
  const runtime = await createMediaRuntime({ temporaryRoot: input.temporaryRoot, db: databaseClient,
    pollIntervalMs: 60_000, store: {
      async put(key, bytes, type) {
        await store.put(key, bytes, type)
        if (input.stage === "publishing" && key.startsWith("media/") && firstPut) {
          firstPut = false
          reached("publishing")
          await new Promise<void>(() => {})
        }
      },
      head: store.head.bind(store), get: store.get.bind(store), delete: store.delete.bind(store), destroy: store.destroy.bind(store),
    } })
  runtimeOwnerId = runtime.ownerId
  reached("owner")
  const png = await sharp({ create: { width: 1600, height: 900, channels: 4, background: "#33559980" } }).png().toBuffer()
  const boundary = "recovery-crash-probe"
  const source = Readable.from((async function* () {
    yield Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="probe.png"\r\nContent-Type: image/png\r\n\r\n`)
    if (input.stage === "receiving") {
      yield png.subarray(0, 30)
      reached("receiving")
      await new Promise<void>(() => {})
    }
    yield png
    yield Buffer.from(`\r\n--${boundary}--\r\n`)
  })())
  const receipt = await runtime.acquireReceipt()
  await receipt.runOwned(() => input.achievementId
    ? receiveAchievementImage(source, { "content-type": `multipart/form-data; boundary=${boundary}` }, {
      ownerId: input.ownerId, teamId: input.teamId, achievementId: input.achievementId,
    }, { temporaryRoot: runtime.temporaryRoot, signal: receipt.signal }, databaseClient)
    : receiveAndQueueMediaJob(source, { "content-type": `multipart/form-data; boundary=${boundary}` }, {
      ownerId: input.ownerId, teamId: input.teamId, imageKind: "achievement",
      resourceKey: input.draftId ? imageTargetKey({ kind: "draft", teamId: input.teamId, id: input.draftId }) : imageTargetKey({ kind: "proposal", teamId: input.teamId, id: input.proposalId! }),
    }, { temporaryRoot: runtime.temporaryRoot, signal: receipt.signal }, databaseClient))
  receipt.release()
  if (input.stage === "queued") reached("queued")
  else runtime.wake()
  while (true) await delay(1000)
}

process.once("message", (message: unknown) => {
  void run(message).catch(() => {
    process.send?.({ stage: "failed" })
    process.exitCode = 1
  })
})
