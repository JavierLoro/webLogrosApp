import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { DATABASE_URL } from "../config/env"
import { AppError } from "../errors/AppError"
import { admitReceivingMediaJob, markMediaJobQueuedAfterClosedReceipt } from "./mediaJobAdmission"
import { claimNextQueuedMediaJob } from "./mediaJobClaims"
import { startMediaJobReceipt, type MediaJobReceiptClaim } from "./mediaJobReceipts"
import { registerReceivingMediaJob } from "./mediaJobs"
import prisma from "./prisma"
import { join } from "node:path"
import { tmpdir } from "node:os"

// 📚 Opt-in y guardanfitrión/Base evitan tocar desarrollo general; los conteos garantizan
// 📚 que la prueba solo consume jobs que ella misma crea y limpia.
test("admisión compartida, cierre de recepción y FIFO por llegada completa", { skip: process.env.MEDIA_JOB_ADMISSION_TEST !== "1" }, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")

  const clients = Array.from({ length: 12 }, () => new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) }))
  const verifier = new Pool({ connectionString: DATABASE_URL })
  t.after(async () => { await Promise.all([...clients.map((client) => client.$disconnect()), verifier.end(), prisma.$disconnect()]) })
  const counts = async () => ({
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    memberships: await prisma.teamMembership.count(),
    achievements: await prisma.logro.count(),
    jobs: await prisma.mediaJob.count(),
  })
  const before = await counts()
  const existingWork = await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED", "PROCESSING", "PUBLISHING"] } } })
  assert.equal(existingWork, 0, "la base aislada debe estar libre de trabajos activos que la prueba pudiera consumir")

  const run = randomUUID()
  const fixture = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-admission-${run}@example.invalid`, password: "integration-only-no-login" } })
    const other = await tx.user.create({ data: { email: `media-admission-other-${run}@example.invalid`, password: "integration-only-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Media Admission Probe", slug: `media-admission-${run}` } })
    await tx.teamMembership.create({ data: { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" } })
    return { owner, other, team }
  })
  const createdIds = new Set<string>()
  const receiptClaims = new Map<string, MediaJobReceiptClaim>()
  const admit = (index: string, client: PrismaClient = prisma) => admitReceivingMediaJob({
    ownerId: fixture.owner.id,
    teamId: fixture.team.id,
    resourceKey: `admission-probe:${run}:${index}`,
  }, client)
  const queueClosed = async (id: string, ownerId = fixture.owner.id, client: PrismaClient = prisma) => {
    let claim = receiptClaims.get(id)
    if (!claim) {
      const job = await client.mediaJob.findUniqueOrThrow({ where: { id } })
      claim = await startMediaJobReceipt({
        id,
        ownerId,
        teamId: job.teamId,
        resourceKey: job.resourceKey,
      }, {
        inputDirectory: join(tmpdir(), "media-admission-db-probe", id),
        imageKind: "achievement",
      }, client)
      receiptClaims.set(id, claim)
    }
    return markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true }, client)
  }
  const makeClaim = async (id: string, client: PrismaClient = prisma): Promise<MediaJobReceiptClaim> => {
    const job = await client.mediaJob.findUniqueOrThrow({ where: { id } })
    const claim = await startMediaJobReceipt({
      id,
      ownerId: fixture.owner.id,
      teamId: job.teamId,
      resourceKey: job.resourceKey,
    }, {
      inputDirectory: join(tmpdir(), "media-admission-db-probe", id),
      imageKind: "achievement",
    }, client)
    receiptClaims.set(id, claim)
    return claim
  }
  const terminalizeOwnJobs = async (): Promise<void> => {
    await verifier.query(
      'UPDATE "MediaJob" SET status = $1, "activeResourceKey" = NULL, "processingSlot" = NULL, "completedAt" = clock_timestamp(), "updatedAt" = clock_timestamp(), "failureCode" = COALESCE("failureCode", $2) WHERE id = ANY($3::uuid[])',
      ["FAILED", "PROBE_CLEANUP", [...createdIds]],
    )
    createdIds.clear()
  }

  try {
    await t.test("12 admisiones concurrentes admiten exactamente 10 plazas de espera", async () => {
      const results = await Promise.allSettled(clients.map((client, index) => admit(`parallel-${index}`, client)))
      const accepted = results.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof admit>>> => result.status === "fulfilled")
      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected")
      accepted.forEach(({ value }) => createdIds.add(value.id))
      assert.equal(accepted.length, 10)
      assert.equal(rejected.length, 2)
      assert.ok(rejected.every(({ reason }) => reason instanceof AppError && reason.statusCode === 503))
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } }), 10)
      await terminalizeOwnJobs()
    })

    await t.test("la admisión y la toma concurrentes comparten el límite global 10+2", async () => {
      const ready = await Promise.all([admit("race-ready-1"), admit("race-ready-2")])
      ready.forEach(({ id }) => createdIds.add(id))
      await Promise.all(ready.map(({ id }) => queueClosed(id)))

      const simultaneous = await Promise.allSettled([
        ...clients.map((client, index) => admit(`race-arrival-${index}`, client)),
        ...clients.slice(0, 2).map((client) => claimNextQueuedMediaJob(client)),
      ])
      const admissions = simultaneous.slice(0, clients.length)
      const admitted = admissions.filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof admit>>> => result.status === "fulfilled")
      const full = admissions.filter((result): result is PromiseRejectedResult => result.status === "rejected")
      admitted.forEach(({ value }) => createdIds.add(value.id))
      assert.ok(admitted.length >= 8 && admitted.length <= 10)
      assert.ok(full.every(({ reason }) => reason instanceof AppError && reason.statusCode === 503))

      const claims = simultaneous.slice(clients.length)
      const claimed = claims.filter((result): result is PromiseFulfilledResult<NonNullable<Awaited<ReturnType<typeof claimNextQueuedMediaJob>>>> =>
        result.status === "fulfilled" && result.value !== null)
      claimed.forEach(({ value }) => createdIds.add(value.id))
      assert.equal(claimed.length, 2)
      assert.equal(new Set(claimed.map(({ value }) => value.id)).size, 2)
      assert.equal(new Set(claimed.map(({ value }) => value.slot)).size, 2)
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } }), admitted.length + 2 - claimed.length)
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["PROCESSING", "PUBLISHING"] } } }), 2)
      assert.equal(await prisma.mediaJob.count({ where: { status: "PUBLISHING" } }), 0)
      assert.ok(admitted.length + 2 <= 12, "la suma de espera y ejecución no supera doce")
      await terminalizeOwnJobs()
    })

    await t.test("destino concurrente único y confirmación scoped al propietario", async () => {
      const key = `admission-probe:${run}:same-destination`
      const results = await Promise.allSettled(clients.slice(0, 2).map((client) => admitReceivingMediaJob({ ownerId: fixture.owner.id, resourceKey: key }, client)))
      const accepted = results.find((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof admitReceivingMediaJob>>> => result.status === "fulfilled")
      const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected")
      assert.ok(accepted)
      createdIds.add(accepted.value.id)
      assert.ok(rejected?.reason instanceof AppError)
      assert.equal(rejected.reason.statusCode, 409)
      await assert.rejects(queueClosed(accepted.value.id, fixture.other.id), (error: unknown) => error instanceof AppError && error.statusCode === 409)
      const claim = await makeClaim(accepted.value.id)
      await assert.rejects(markMediaJobQueuedAfterClosedReceipt({
        claim,
        receiverConfirmedClosed: false as true,
      }), (error: unknown) => error instanceof AppError && error.statusCode === 400)
      assert.equal((await prisma.mediaJob.findUniqueOrThrow({ where: { id: accepted.value.id } })).status, "RECEIVING")
      await assert.rejects(
        verifier.query('UPDATE "MediaJob" SET "queuedAt" = clock_timestamp(), "queueExpiresAt" = clock_timestamp() + INTERVAL \'180 seconds\' WHERE id = $1', [accepted.value.id]),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_queue_timing_consistency",
      )
      const queued = await markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true })
      assert.equal(queued.status, "QUEUED")
      const persisted = await prisma.mediaJob.findUniqueOrThrow({ where: { id: accepted.value.id } })
      assert.ok(persisted.queuedAt instanceof Date)
      assert.ok(persisted.queueExpiresAt instanceof Date)
      assert.equal(persisted.queueExpiresAt.getTime() - persisted.queuedAt.getTime(), 180_000)
      await assert.rejects(
        verifier.query('UPDATE "MediaJob" SET "queuedAt" = NULL, "queueExpiresAt" = NULL WHERE id = $1', [accepted.value.id]),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_queue_timing_consistency",
      )
      const repeated = await queueClosed(accepted.value.id)
      const afterRetry = await prisma.mediaJob.findUniqueOrThrow({ where: { id: accepted.value.id } })
      assert.equal(repeated.status, "QUEUED")
      assert.equal(afterRetry.queueExpiresAt?.getTime(), persisted.queueExpiresAt.getTime())
      await verifier.query('UPDATE "MediaJob" SET "queueExpiresAt" = clock_timestamp()::timestamp(3) WHERE id = $1', [accepted.value.id])
      await assert.rejects(queueClosed(accepted.value.id), (error: unknown) => error instanceof AppError && error.statusCode === 409)
      const expiredRetry = await prisma.mediaJob.findUniqueOrThrow({ where: { id: accepted.value.id } })
      assert.equal(expiredRetry.status, "FAILED")
      assert.equal(expiredRetry.failureCode, "WAIT_TIMEOUT")
      assert.equal(expiredRetry.activeResourceKey, null)
      await terminalizeOwnJobs()
    })

    await t.test("el inicio del recibo emite un solo token y requiere ruta con UUID del trabajo", async () => {
      const job = await admit("receipt-one-shot")
      createdIds.add(job.id)
      const claim = await makeClaim(job.id)
      assert.equal(claim.id, job.id)
      assert.equal(claim.receiptToken.length, 36)
      assert.equal(claim.inputDirectory.split(/[\\/]/).pop(), job.id)
      await assert.rejects(startMediaJobReceipt({
        id: job.id,
        ownerId: fixture.owner.id,
        teamId: fixture.team.id,
        resourceKey: `admission-probe:${run}:receipt-one-shot`,
      }, {
        inputDirectory: join(tmpdir(), "media-admission-db-probe", job.id),
        imageKind: "achievement",
      }), (error: unknown) => error instanceof AppError && error.statusCode === 409)
      const persisted = await prisma.mediaJob.findUniqueOrThrow({ where: { id: job.id } })
      assert.equal(persisted.receiptToken, claim.receiptToken)
      assert.equal(persisted.status, "RECEIVING")
    })

    await t.test("FIFO sigue el orden de cierre de recepción, con createdAt invertido", async () => {
      const firstCreated = await admit("fifo-created-first")
      const secondCreated = await admit("fifo-created-second")
      createdIds.add(firstCreated.id)
      createdIds.add(secondCreated.id)
      await verifier.query('UPDATE "MediaJob" SET "createdAt" = $1 WHERE id = $2', [new Date("2020-01-01T00:00:00.000Z"), firstCreated.id])
      await verifier.query('UPDATE "MediaJob" SET "createdAt" = $1 WHERE id = $2', [new Date("2021-01-01T00:00:00.000Z"), secondCreated.id])
      await queueClosed(secondCreated.id)
      await queueClosed(firstCreated.id)

      // 📚 Timestamps fijos evitan empates de milisegundo sin dormir; la llegada completa
      // 📚 de secondCreated queda antes, aunque su createdAt sea posterior.
      // 📚 El cast fija el tipo del parámetro antes de sumar un intervalo; sin él,
      // 📚 PostgreSQL puede inferir tipos incompatibles para sus dos usos de $1.
      await verifier.query(
        'UPDATE "MediaJob" SET "queuedAt" = $1::timestamp(3), "queueExpiresAt" = $1::timestamp(3) + INTERVAL \'180 seconds\' WHERE id = $2',
        [new Date("2099-01-01T00:00:00.000Z"), secondCreated.id],
      )
      await verifier.query(
        'UPDATE "MediaJob" SET "queuedAt" = $1::timestamp(3), "queueExpiresAt" = $1::timestamp(3) + INTERVAL \'180 seconds\' WHERE id = $2',
        [new Date("2099-01-01T00:00:01.000Z"), firstCreated.id],
      )
      const queuedTimes = await prisma.mediaJob.findMany({
        where: { id: { in: [firstCreated.id, secondCreated.id] } },
        select: { id: true, createdAt: true, queuedAt: true },
      })
      const firstQueued = queuedTimes.find(({ id }) => id === firstCreated.id)
      const secondQueued = queuedTimes.find(({ id }) => id === secondCreated.id)
      assert.ok(firstQueued && secondQueued)
      assert.ok(firstQueued.createdAt < secondQueued.createdAt)
      assert.ok(secondQueued.queuedAt && firstQueued.queuedAt && secondQueued.queuedAt < firstQueued.queuedAt)

      const claimed = await claimNextQueuedMediaJob()
      assert.equal(claimed?.id, secondCreated.id)
      await terminalizeOwnJobs()
    })

    await t.test("dos puestos activos y diez en espera se coordinan como doce plazas totales", async () => {
      const active = await Promise.all([admit("active-1"), admit("active-2")])
      active.forEach(({ id }) => createdIds.add(id))
      await Promise.all(active.map(({ id }) => queueClosed(id)))
      const claimed = await Promise.all([claimNextQueuedMediaJob(), claimNextQueuedMediaJob()])
      assert.equal(claimed.filter(Boolean).length, 2)
      assert.deepEqual(new Set(claimed.map((job) => job?.slot)), new Set([1, 2]))

      const waiting = await Promise.all(Array.from({ length: 10 }, (_, index) => admit(`wait-${index}`)))
      waiting.forEach(({ id }) => createdIds.add(id))
      await assert.rejects(admit("wait-overflow"), (error: unknown) => error instanceof AppError && error.statusCode === 503)
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } }), 10)
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["PROCESSING", "PUBLISHING"] } } }), 2)
      await terminalizeOwnJobs()
    })

    await t.test("plazo alcanzado libera QUEUED antes de contar incluso si el nuevo intento queda lleno", async () => {
      const receiving = await Promise.all(Array.from({ length: 10 }, (_, index) => admit(`full-receiving-${index}`)))
      receiving.forEach(({ id }) => createdIds.add(id))
      const expired = await registerReceivingMediaJob({ ownerId: fixture.owner.id, resourceKey: `admission-probe:${run}:expired` })
      createdIds.add(expired.id)
      await queueClosed(expired.id)
      await verifier.query('UPDATE "MediaJob" SET "queueExpiresAt" = clock_timestamp()::timestamp(3) WHERE id = $1', [expired.id])

      await assert.rejects(admit("still-full"), (error: unknown) => error instanceof AppError && error.statusCode === 503)
      const saved = await prisma.mediaJob.findUniqueOrThrow({ where: { id: expired.id } })
      assert.equal(saved.status, "FAILED")
      assert.equal(saved.failureCode, "WAIT_TIMEOUT")
      assert.equal(saved.activeResourceKey, null)
      assert.ok(saved.completedAt instanceof Date)
      assert.equal(await prisma.mediaJob.count({ where: { status: { in: ["RECEIVING", "QUEUED"] } } }), 10)
      await terminalizeOwnJobs()
    })

    await t.test("toma terminaliza un QUEUED cuyo plazo ya se alcanzó", async () => {
      const expired = await admit("claim-expired")
      createdIds.add(expired.id)
      await queueClosed(expired.id)
      await verifier.query('UPDATE "MediaJob" SET "queueExpiresAt" = clock_timestamp()::timestamp(3) WHERE id = $1', [expired.id])
      assert.equal(await claimNextQueuedMediaJob(), null)
      const saved = await prisma.mediaJob.findUniqueOrThrow({ where: { id: expired.id } })
      assert.equal(saved.status, "FAILED")
      assert.equal(saved.failureCode, "WAIT_TIMEOUT")
      await terminalizeOwnJobs()
    })
  } finally {
    await terminalizeOwnJobs()
    await prisma.$transaction(async (tx) => {
      await tx.mediaJob.deleteMany({ where: { ownerId: { in: [fixture.owner.id, fixture.other.id] } } })
      await tx.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
      await tx.team.delete({ where: { id: fixture.team.id } })
      await tx.user.deleteMany({ where: { id: { in: [fixture.owner.id, fixture.other.id] } } })
    })
    const after = await counts()
    assert.deepEqual(after, before)
    t.diagnostic(JSON.stringify({ before, after, fixturesRemoved: true }))
  }
})
