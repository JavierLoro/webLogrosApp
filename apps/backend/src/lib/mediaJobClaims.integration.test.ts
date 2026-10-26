import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { DATABASE_URL } from "../config/env"
import { findMediaJobForOwner } from "./mediaJobs"
import { claimNextQueuedMediaJob } from "./mediaJobClaims"
import prisma from "./prisma"

// 📚 Esta prueba escribe únicamente cuando se activa de forma explícita y confirma
// 📚 host/puerto/base antes de crear fixtures; nunca limpia trabajos de terceros.
test("toma atómica de trabajos QUEUED", { skip: process.env.MEDIA_JOB_CLAIMS_TEST !== "1" }, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")

  const claimClients = Array.from({ length: 8 }, () => new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) }))
  const verifier = new Pool({ connectionString: DATABASE_URL })
  t.after(async () => {
    await Promise.all([...claimClients.map((client) => client.$disconnect()), verifier.end(), prisma.$disconnect()])
  })

  const counts = async () => ({
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    memberships: await prisma.teamMembership.count(),
    achievements: await prisma.logro.count(),
    jobs: await prisma.mediaJob.count(),
  })
  const before = await counts()
  const preexistingJobs = await prisma.mediaJob.count({ where: { status: { in: ["QUEUED", "PROCESSING", "PUBLISHING"] } } })
  assert.equal(preexistingJobs, 0, "la base de prueba debe estar libre de trabajos que la prueba pudiera consumir")

  const run = randomUUID()
  const createdAt = new Date("2026-01-01T00:00:00.000Z")
  // 📚 Ordenamos UUIDs únicos para controlar el desempate por id sin reutilizar IDs entre ejecuciones.
  const tiedIds = [randomUUID(), randomUUID()].sort()
  const fixture = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-claim-${run}@example.invalid`, password: "integration-only-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Media Claim Probe", slug: `media-claim-${run}` } })
    await tx.teamMembership.create({ data: { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" } })
    const jobs: Array<{ id: string }> = []
    for (const index of Array.from({ length: 7 }, (_, value) => value)) {
      jobs.push(await tx.mediaJob.create({
        data: {
          ...(index >= 5 ? { id: tiedIds[index - 5] } : {}),
          ownerId: owner.id,
          teamId: team.id,
          resourceKey: `claim-probe:${run}:${index}`,
          activeResourceKey: `claim-probe:${run}:${index}`,
          status: "QUEUED",
          createdAt: new Date(createdAt.getTime() + Math.min(index, 5) * 1_000),
          queuedAt: new Date(createdAt.getTime() + Math.min(index, 5) * 1_000),
          queueExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
        },
        select: { id: true },
      }))
    }
    // 📚 RECEIVING es más antiguo que todos los QUEUED: si la toma no filtra estado, la prueba falla.
    const receiving = await tx.mediaJob.create({
      data: {
        ownerId: owner.id,
        resourceKey: `claim-probe:${run}:receiving`,
        activeResourceKey: `claim-probe:${run}:receiving`,
        status: "RECEIVING",
        createdAt: new Date(createdAt.getTime() - 1_000),
      },
      select: { id: true },
    })
    return { owner, team, jobs, receiving }
  })
  const { jobs, receiving } = fixture
  let fifoFirstToken = ""

  try {
    await t.test("FIFO determinista excluye RECEIVING y el DTO de propietario oculta datos internos", async () => {
      const first = await claimNextQueuedMediaJob()
      const second = await claimNextQueuedMediaJob()
      assert.equal(first?.id, jobs[0].id)
      assert.equal(second?.id, jobs[1].id)
      assert.deepEqual([first?.slot, second?.slot], [1, 2])
      fifoFirstToken = first?.executionToken ?? ""
      assert.match(first?.executionToken ?? "", /^[0-9a-f-]{36}$/i)
      assert.ok(first?.startedAt instanceof Date)
      assert.notEqual(first?.executionToken, second?.executionToken)
      assert.notEqual(first?.id, receiving.id)

      const ownerView = await findMediaJobForOwner(first!.id, fixture.owner.id)
      assert.ok(ownerView)
      assert.equal("executionToken" in ownerView, false)
      assert.equal("processingSlot" in ownerView, false)
    })

    await t.test("PUBLISHING conserva capacidad y al liberar una ranura se toma el siguiente QUEUED", async () => {
      // 📚 Esta fixture solo comprueba el estado y la ranura; no representa un resultado Sharp real.
      await verifier.query(
        'UPDATE "MediaJob" SET status = $1, "executorStartedAt" = clock_timestamp(), "imageKind" = $2, "inputDirectory" = $3, "resultDirectory" = $4, "resultManifest" = $5::jsonb WHERE id = $6',
        ["PUBLISHING", "achievement", "/tmp/claim-fixture/input", "/tmp/claim-fixture/result", JSON.stringify({ kind: "achievement", inputFormat: "png", variants: [] }), jobs[0].id],
      )
      assert.equal(await claimNextQueuedMediaJob(), null)

      await verifier.query(
        'UPDATE "MediaJob" SET status = $1, "processingSlot" = NULL, "activeResourceKey" = NULL, "completedAt" = clock_timestamp(), "failureCode" = $2 WHERE id = $3',
        ["FAILED", "PROBE_FAILURE", jobs[0].id],
      )
      const finished = await prisma.mediaJob.findUniqueOrThrow({ where: { id: jobs[0].id } })
      assert.equal(finished.processingSlot, null)
      assert.equal(finished.executionToken, fifoFirstToken)
      const third = await claimNextQueuedMediaJob()
      assert.equal(third?.id, jobs[2].id)
      assert.equal(third?.slot, 1)
    })

    await t.test("varios clientes concurrentes nunca reclaman más de dos puestos", async () => {
      await verifier.query(
        'UPDATE "MediaJob" SET status = $1, "processingSlot" = NULL, "activeResourceKey" = NULL, "completedAt" = clock_timestamp(), "failureCode" = $2 WHERE id = $3',
        ["FAILED", "PROBE_FAILURE", jobs[1].id],
      )
      await verifier.query(
        'UPDATE "MediaJob" SET status = $1, "processingSlot" = NULL, "activeResourceKey" = NULL, "completedAt" = clock_timestamp(), "failureCode" = $2 WHERE id = $3',
        ["FAILED", "PROBE_FAILURE", jobs[2].id],
      )
      const results = await Promise.all(claimClients.map((client) => claimNextQueuedMediaJob(client)))
      const claimed = results.filter((job) => job !== null)
      assert.equal(claimed.length, 2)
      assert.equal(new Set(claimed.map((job) => job.id)).size, 2)
      assert.deepEqual(
        claimed.map((job) => job.id).sort(),
        [jobs[3].id, jobs[4].id].sort(),
      )
      assert.deepEqual(new Set(claimed.map((job) => job.slot)), new Set([1, 2]))
      assert.equal(results.filter((job) => job === null).length, 6)
      assert.equal(await claimNextQueuedMediaJob(), null)

      // 📚 La fixture terminal conserva token/fecha como historial, pero libera el puesto.
      for (const job of claimed) {
        await verifier.query(
          'UPDATE "MediaJob" SET status = $1, "processingSlot" = NULL, "activeResourceKey" = NULL, "completedAt" = clock_timestamp(), "failureCode" = $2 WHERE id = $3',
          ["FAILED", "PROBE_FAILURE", job.id],
        )
      }
    })

    await t.test("PostgreSQL rechaza puesto inválido, duplicado y transición incompleta", async () => {
      await assert.rejects(
        verifier.query(
          'UPDATE "MediaJob" SET status = $1, "processingSlot" = 3, "executionToken" = $2, "processingStartedAt" = clock_timestamp() WHERE id = $3',
          ["PROCESSING", randomUUID(), jobs[6].id],
        ),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_processing_slot_range",
      )
      await assert.rejects(
        verifier.query('UPDATE "MediaJob" SET status = $1 WHERE id = $2', ["PROCESSING", jobs[6].id]),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_processing_claim_consistency",
      )
      const stillQueued = await prisma.mediaJob.findUniqueOrThrow({ where: { id: jobs[6].id } })
      assert.equal(stillQueued.status, "QUEUED")
      assert.equal(stillQueued.processingSlot, null)
      assert.equal(stillQueued.executionToken, null)

      const active = await claimNextQueuedMediaJob()
      assert.ok(active)
      assert.ok(jobs[5].id < jobs[6].id, "los UUID deterministas deben ordenar el empate en createdAt")
      assert.equal(active.id, jobs[5].id, "FIFO desempata createdAt con id ascendente")
      await assert.rejects(
        verifier.query(
          'UPDATE "MediaJob" SET status = $1, "processingSlot" = $2, "executionToken" = $3, "processingStartedAt" = clock_timestamp() WHERE id = $4',
          ["PROCESSING", active.slot, randomUUID(), jobs[6].id],
        ),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23505"
          && (error as { constraint?: string }).constraint === "MediaJob_processingSlot_key",
      )
      const duplicateStayedQueued = await prisma.mediaJob.findUniqueOrThrow({ where: { id: jobs[6].id } })
      assert.equal(duplicateStayedQueued.status, "QUEUED")
      assert.equal(duplicateStayedQueued.processingSlot, null)
      await verifier.query(
        'UPDATE "MediaJob" SET status = $1, "processingSlot" = NULL, "activeResourceKey" = NULL, "completedAt" = clock_timestamp(), "failureCode" = $2 WHERE id = $3',
        ["FAILED", "PROBE_FAILURE", active.id],
      )
    })
  } finally {
    // 📚 Limpieza por UUIDs creados en este caso: conserva cualquier fila previa intacta.
    await prisma.$transaction(async (tx) => {
      await tx.mediaJob.deleteMany({ where: { id: { in: [...jobs.map(({ id }) => id), receiving.id] } } })
      await tx.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
      await tx.team.delete({ where: { id: fixture.team.id } })
      await tx.user.delete({ where: { id: fixture.owner.id } })
    })
    const after = await counts()
    assert.deepEqual(after, before)
    t.diagnostic(JSON.stringify({ before, after, fixturesRemoved: true }))
  }
})
