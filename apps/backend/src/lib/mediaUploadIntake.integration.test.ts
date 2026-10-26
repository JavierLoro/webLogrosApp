import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises"
import { IncomingHttpHeaders } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { Readable } from "node:stream"
import { test } from "node:test"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import sharp from "sharp"
import { DATABASE_URL } from "../config/env"
import { AppError } from "../errors/AppError"
import { markMediaJobQueuedAfterClosedReceipt } from "./mediaJobAdmission"
import { admitReceivingMediaJob } from "./mediaJobAdmission"
import { MediaJobReceiptClaim } from "./mediaJobReceipts"
import { receiveAndQueueMediaJob } from "./mediaUploadIntake"

const BOUNDARY = "lockerboard-media-intake-integration"
const HEADERS: IncomingHttpHeaders = { "content-type": `multipart/form-data; boundary=${BOUNDARY}` }

// 📚 La prueba usa el parser y filesystem reales, pero la suite queda apagada fuera
// 📚 de la base aislada explícita para no reservar plazas en datos de desarrollo.
test("intake enlaza reserva, archivo cerrado y confirmación QUEUED", { skip: process.env.MEDIA_UPLOAD_INTAKE_TEST !== "1" }, async (t) => {
  const database = new URL(DATABASE_URL)
  assert.equal(database.hostname, "127.0.0.1")
  assert.equal(database.port, "55437")
  assert.equal(database.pathname, "/weblogros_ui")

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const verifier = new Pool({ connectionString: DATABASE_URL })
  const before = {
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    memberships: await prisma.teamMembership.count(),
    achievements: await prisma.logro.count(),
    jobs: await prisma.mediaJob.count(),
  }
  assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } }), 0,
    "la base aislada debe estar libre de jobs activos antes de la prueba")

  const run = randomUUID()
  const fixture = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-intake-${run}@example.invalid`, password: "integration-only-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Media Intake Probe", slug: `media-intake-${run}` } })
    await tx.teamMembership.create({ data: { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" } })
    return { owner, team }
  })
  const tempBase = await realpath(tmpdir())
  const temporaryRoot = await realpath(await mkdtemp(join(tempBase, "media-intake-test-")))
  const createdIds = new Set<string>()
  const terminalize = async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return
    await verifier.query(
      'UPDATE "MediaJob" SET status = \'FAILED\', "activeResourceKey" = NULL, "processingSlot" = NULL, "completedAt" = clock_timestamp(), "updatedAt" = clock_timestamp(), "failureCode" = COALESCE("failureCode", \'INTAKE_TEST_CLEANUP\') WHERE id = ANY($1::uuid[])',
      [ids],
    )
  }
  const input = (resource: string) => ({
    ownerId: fixture.owner.id,
    teamId: fixture.team.id,
    resourceKey: `intake-probe:${run}:${resource}`,
    imageKind: "achievement" as const,
  })
  const sourceWithBytes = (bytes: Buffer, field = "image", close = true): Readable => Readable.from((async function* () {
    yield Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${field}"; filename="../../client-name.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`)
    yield bytes
    if (close) yield Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
  })())
  const sourceFor = async (field = "image", close = true): Promise<Readable> => sourceWithBytes(
    await sharp({ create: { width: 3, height: 2, channels: 3, background: "#2255aa" } }).jpeg().toBuffer(), field, close,
  )
  class SlowSource extends Readable {
    private readonly chunks: Buffer[]
    private position = 0
    private timer?: NodeJS.Timeout
    private readonly beforeFooter?: () => void

    constructor(payload: Buffer, beforeFooter?: () => void) {
      super()
      this.beforeFooter = beforeFooter
      this.chunks = [
        Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="slow.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
        payload,
        Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
      ]
    }

    override _read(): void {
      if (this.timer) return
      this.timer = setTimeout(() => {
        this.timer = undefined
        const next = this.chunks[this.position++]
        if (this.position === 3) this.beforeFooter?.()
        if (next) this.push(next)
        else this.push(null)
      }, 8)
    }

    override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
      if (this.timer) clearTimeout(this.timer)
      setTimeout(() => callback(error), 20)
    }
  }
  const jobsForRun = async () => prisma.mediaJob.findMany({
    where: { ownerId: fixture.owner.id, resourceKey: { startsWith: `intake-probe:${run}:` } },
    orderBy: { createdAt: "asc" },
  })

  try {
    await t.test("éxito guarda identidad privada y no devuelve rutas", async () => {
      const source = await sourceFor()
      const result = await receiveAndQueueMediaJob(source, HEADERS, input("success"), { temporaryRoot }, prisma)
      createdIds.add(result.job.id)
      assert.equal(result.job.status, "QUEUED")
      assert.equal(result.cancellation, "none")
      assert.equal(source.closed, true)
      const persisted = await prisma.mediaJob.findUniqueOrThrow({ where: { id: result.job.id } })
      assert.equal(persisted.ownerId, fixture.owner.id)
      assert.equal(persisted.teamId, fixture.team.id)
      assert.equal(persisted.receiptToken?.length, 36)
      assert.ok(persisted.receiptStartedAt instanceof Date)
      assert.equal(persisted.imageKind, "achievement")
      assert.equal(persisted.inputDirectory, join(temporaryRoot, result.job.id))
      assert.ok(persisted.queuedAt instanceof Date)
      assert.ok(persisted.queueExpiresAt instanceof Date)
      assert.equal(persisted.queueExpiresAt.getTime() - persisted.queuedAt.getTime(), 180_000)
      assert.equal(JSON.stringify(result).includes(temporaryRoot), false)
      assert.ok((await readFile(join(persisted.inputDirectory!, "input.tmp"))).length > 0)

      const claim: MediaJobReceiptClaim = {
        id: persisted.id,
        ownerId: persisted.ownerId,
        teamId: persisted.teamId,
        resourceKey: persisted.resourceKey,
        receiptToken: persisted.receiptToken!,
        startedAt: persisted.receiptStartedAt!,
        inputDirectory: persisted.inputDirectory!,
        imageKind: "achievement",
      }
      const wrongToken = { ...claim, receiptToken: randomUUID() }
      await assert.rejects(markMediaJobQueuedAfterClosedReceipt({ claim: wrongToken, receiverConfirmedClosed: true }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 409)
      assert.equal((await prisma.mediaJob.findUniqueOrThrow({ where: { id: persisted.id } })).status, "QUEUED")
    })

    await t.test("destino ya reservado rechaza y cierra el segundo source", async () => {
      const source = await sourceFor()
      const beforeCount = await prisma.mediaJob.count({ where: { ownerId: fixture.owner.id } })
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("success"), { temporaryRoot }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 409)
      assert.equal(source.closed, true)
      assert.equal(await prisma.mediaJob.count({ where: { ownerId: fixture.owner.id } }), beforeCount)
      const successJob = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":success"))
      assert.ok(successJob)
      await terminalize([successJob.id])
    })

    await t.test("cola llena rechaza sin leer el stream y espera su cierre", async () => {
      const alreadyWaiting = await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } })
      const fillers = await Promise.all(Array.from({ length: 10 - alreadyWaiting }, (_, index) => admitReceivingMediaJob({
        ownerId: fixture.owner.id,
        teamId: fixture.team.id,
        resourceKey: `intake-probe:${run}:full-${index}`,
      }, prisma)))
      fillers.forEach(({ id }) => createdIds.add(id))
      let reads = 0
      const source = new Readable({ read() { reads += 1; this.push(null) } })
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("queue-full"), { temporaryRoot }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 503)
      assert.equal(source.closed, true)
      assert.equal(reads, 0)
      assert.equal((await jobsForRun()).some(({ resourceKey }) => resourceKey.endsWith(":queue-full")), false)
      await terminalize(fillers.map(({ id }) => id))
    })

    await t.test("formulario inválido cierra source, falla el job y libera el destino", async () => {
      const source = await sourceFor("other-field")
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("wrong-field"), { temporaryRoot }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 400)
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":wrong-field"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "FAILED")
      assert.equal(job.failureCode, "UNEXPECTED_FILE_FIELD")
      assert.equal(job.activeResourceKey, null)
    })

    await t.test("firma de imagen inválida se terminaliza tras cerrar source", async () => {
      const source = sourceWithBytes(Buffer.from("executable or text payload"))
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("bad-magic"), { temporaryRoot }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 415)
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":bad-magic"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "FAILED")
      assert.equal(job.failureCode, "UNSUPPORTED_FORMAT")
      assert.equal(job.activeResourceKey, null)
    })

    await t.test("corte durante transferencia espera el cierre y termina CANCELED", async () => {
      const jpeg = await sharp({ create: { width: 3, height: 2, channels: 3, background: "#2255aa" } }).jpeg().toBuffer()
      const controller = new AbortController()
      const source = new SlowSource(jpeg, () => controller.abort())
      const receipts = require("./mediaJobReceipts") as typeof import("./mediaJobReceipts")
      const originalFinish = receipts.finishMediaJobReceipt
      receipts.finishMediaJobReceipt = async (...args) => {
        assert.equal(source.closed, true, "el CANCELED no se persiste hasta confirmar close físico")
        return originalFinish(...args)
      }
      try {
        await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("mid-transfer-abort"),
          { temporaryRoot, signal: controller.signal }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 409)
      } finally {
        receipts.finishMediaJobReceipt = originalFinish
      }
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":mid-transfer-abort"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "CANCELED")
      assert.equal(job.failureCode, "UPLOAD_ABORTED")
      assert.equal(job.activeResourceKey, null)
    })

    await t.test("colisión EEXIST después del claim conserva carpeta ajena y RECEIVING", async () => {
      const receiver = require("./mediaUploadReceiver") as typeof import("./mediaUploadReceiver")
      const original = receiver.receiveMediaUpload
      receiver.receiveMediaUpload = async (source, headers, options) => {
        const directory = join(options.temporaryRoot, options.jobId)
        await mkdir(directory, { mode: 0o700 })
        await writeFile(join(directory, "input.tmp"), "prior owner data", { flag: "wx", mode: 0o600 })
        return original(source, headers, options)
      }
      const source = await sourceFor()
      try {
        await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("workspace-collision"), { temporaryRoot }, prisma),
          (error: unknown) => error instanceof AppError && error.statusCode === 409)
      } finally {
        receiver.receiveMediaUpload = original
      }
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":workspace-collision"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "RECEIVING")
      assert.equal(job.failureCode, null)
      assert.equal(await readFile(join(temporaryRoot, job.id, "input.tmp"), "utf8"), "prior owner data")
      await terminalize([job.id])
    })

    await t.test("pre-abort cierra source y no crea una admisión", async () => {
      const beforeCount = await prisma.mediaJob.count({ where: { ownerId: fixture.owner.id } })
      const source = await sourceFor()
      const controller = new AbortController()
      controller.abort()
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("pre-abort"), { temporaryRoot, signal: controller.signal }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 409)
      assert.equal(source.closed, true)
      assert.equal(await prisma.mediaJob.count({ where: { ownerId: fixture.owner.id } }), beforeCount)
    })

    await t.test("fallo de confirmación incierto no borra archivo ni inventa terminal", async () => {
      const source = await sourceFor()
      let transactions = 0
      const uncertainClient = new Proxy(prisma, {
        get(target, key) {
          if (key === "$transaction") {
            return async (...args: unknown[]) => {
              const transaction = target.$transaction as (...values: unknown[]) => Promise<unknown>
              const committed = await transaction.apply(target, args)
              transactions += 1
              if (transactions === 2) throw new Error("simulated lost acknowledgement after commit")
              return committed
            }
          }
          const value = Reflect.get(target, key, target) as unknown
          return typeof value === "function" ? value.bind(target) : value
        },
      }) as PrismaClient
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("lost-ack"), { temporaryRoot }, uncertainClient),
        (error: unknown) => error instanceof AppError && error.statusCode === 503)
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":lost-ack"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "QUEUED")
      assert.ok(job.receiptToken)
      assert.equal((await lstat(join(temporaryRoot, job.id, "input.tmp"))).isFile(), true)
      await terminalize([job.id])
    })

    await t.test("fallo de ACK antes de commit conserva archivo y RECEIVING", async () => {
      const source = await sourceFor()
      let transactions = 0
      const failBeforeAck = new Proxy(prisma, {
        get(target, key) {
          if (key === "$transaction") {
            return async (...args: unknown[]) => {
              transactions += 1
              if (transactions === 2) throw new Error("simulated ack transaction failure")
              const transaction = target.$transaction as (...values: unknown[]) => Promise<unknown>
              return transaction.apply(target, args)
            }
          }
          const value = Reflect.get(target, key, target) as unknown
          return typeof value === "function" ? value.bind(target) : value
        },
      }) as PrismaClient
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("ack-before-commit"), { temporaryRoot }, failBeforeAck),
        (error: unknown) => error instanceof AppError && error.statusCode === 503)
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":ack-before-commit"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "RECEIVING")
      assert.ok(job.receiptToken)
      assert.equal((await lstat(join(temporaryRoot, job.id, "input.tmp"))).isFile(), true)
      await terminalize([job.id])
    })

    await t.test("cancelación durante ACK devuelve too_late cuando QUEUED ya confirmó", async () => {
      const source = await sourceFor()
      const controller = new AbortController()
      let transactions = 0
      const abortAfterAckCommit = new Proxy(prisma, {
        get(target, key) {
          if (key === "$transaction") {
            return async (...args: unknown[]) => {
              const transaction = target.$transaction as (...values: unknown[]) => Promise<unknown>
              const result = await transaction.apply(target, args)
              transactions += 1
              if (transactions === 2) controller.abort()
              return result
            }
          }
          const value = Reflect.get(target, key, target) as unknown
          return typeof value === "function" ? value.bind(target) : value
        },
      }) as PrismaClient
      const result = await receiveAndQueueMediaJob(source, HEADERS, input("too-late"),
        { temporaryRoot, signal: controller.signal }, abortAfterAckCommit)
      createdIds.add(result.job.id)
      assert.equal(source.closed, true)
      assert.equal(result.job.status, "QUEUED")
      assert.equal(result.cancellation, "too_late")
      await terminalize([result.job.id])
    })

    await t.test("fallo al crear claim conserva RECEIVING sin iniciar transferencia", async () => {
      const source = await sourceFor()
      const noReceiptWrite = new Proxy(prisma, {
        get(target, key) {
          if (key === "$queryRaw") return async () => { throw new Error("simulated receipt write outage") }
          const value = Reflect.get(target, key, target) as unknown
          return typeof value === "function" ? value.bind(target) : value
        },
      }) as PrismaClient
      await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("receipt-db-failure"), { temporaryRoot }, noReceiptWrite),
        (error: unknown) => error instanceof AppError && error.statusCode === 503)
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":receipt-db-failure"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "RECEIVING")
      assert.equal(job.receiptToken, null)
      assert.equal(await lstat(join(temporaryRoot, job.id)).catch(() => null), null)
      await terminalize([job.id])
    })

    await t.test("cancelación tras cerrar receiver y antes del ACK conserva cleanupPending", async () => {
      const receiver = require("./mediaUploadReceiver") as typeof import("./mediaUploadReceiver")
      const original = receiver.receiveMediaUpload
      const controller = new AbortController()
      receiver.receiveMediaUpload = async (source, headers, options) => {
        const result = await original(source, headers, options)
        controller.abort()
        return result
      }
      const source = await sourceFor()
      try {
        await assert.rejects(receiveAndQueueMediaJob(source, HEADERS, input("abort-after-receiver"),
          { temporaryRoot, signal: controller.signal }, prisma),
        (error: unknown) => error instanceof AppError && error.statusCode === 409)
      } finally {
        receiver.receiveMediaUpload = original
      }
      assert.equal(source.closed, true)
      const job = (await jobsForRun()).find(({ resourceKey }) => resourceKey.endsWith(":abort-after-receiver"))
      assert.ok(job)
      createdIds.add(job.id)
      assert.equal(job.status, "CANCELED")
      assert.equal(job.cleanupPendingDirectory, join(temporaryRoot, job.id))
      assert.equal((await lstat(join(temporaryRoot, job.id, "input.tmp"))).isFile(), true)
      await terminalize([job.id])
    })
  } finally {
    await terminalize([...createdIds])
    await prisma.mediaJob.deleteMany({ where: { ownerId: fixture.owner.id, id: { in: [...createdIds] } } })
    await prisma.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
    await prisma.team.delete({ where: { id: fixture.team.id } })
    await prisma.user.delete({ where: { id: fixture.owner.id } })

    assert.equal(dirname(temporaryRoot), tempBase)
    assert.ok(resolve(temporaryRoot).startsWith(join(tempBase, "media-intake-test-")))
    assert.equal(await realpath(temporaryRoot), temporaryRoot)
    await rm(temporaryRoot, { recursive: true, force: false })

    const after = {
      users: await prisma.user.count(),
      teams: await prisma.team.count(),
      memberships: await prisma.teamMembership.count(),
      achievements: await prisma.logro.count(),
      jobs: await prisma.mediaJob.count(),
    }
    assert.deepEqual(after, before)
    t.diagnostic(JSON.stringify({ before, after, fixturesRemoved: true }))
    await Promise.all([prisma.$disconnect(), verifier.end()])
  }
})
