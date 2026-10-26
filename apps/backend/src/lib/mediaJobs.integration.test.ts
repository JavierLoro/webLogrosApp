import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import { DATABASE_URL } from "../config/env"
import { AppError } from "../errors/AppError"
import { findMediaJobForOwner, registerReceivingMediaJob } from "./mediaJobs"
import prisma from "./prisma"

// 📚 Opt-in y guard de destino: el ensayo solo puede escribir en la base Windows
// 📚 aislada. No ejecuta seed ni reset y elimina únicamente sus fixtures propios.
test("registro persistente de trabajos de imagen", { skip: process.env.MEDIA_JOB_REGISTRY_TEST !== "1" }, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")

  const second = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const verifier = new Pool({ connectionString: DATABASE_URL })
  // 📚 El hook cierra conexiones incluso si falla la preparación de las fixtures.
  t.after(async () => { await Promise.all([second.$disconnect(), verifier.end(), prisma.$disconnect()]) })
  const counts = async () => ({
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    memberships: await prisma.teamMembership.count(),
    achievements: await prisma.logro.count(),
    jobs: await prisma.mediaJob.count(),
  })
  const before = await counts()
  const run = randomUUID()
  const fixture = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-owner-${run}@example.invalid`, password: "integration-only-no-login" } })
    const other = await tx.user.create({ data: { email: `media-other-${run}@example.invalid`, password: "integration-only-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Media Registry Probe", slug: `media-registry-${run}` } })
    await tx.teamMembership.create({ data: { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" } })
    return { owner, other, team }
  })
  const resourceKey = `user-avatar:${fixture.owner.id}`
  let id = ""

  try {
    await t.test("registra RECEIVING y otra conexión recupera el mismo estado", async () => {
      const job = await registerReceivingMediaJob({ ownerId: fixture.owner.id, resourceKey })
      id = job.id
      assert.equal(job.status, "RECEIVING")
      assert.equal(job.completedAt, null)
      // 📚 El DTO es una lista permitida; no expone activeResourceKey ni campos internos.
      assert.deepEqual(Object.keys(job).sort(), ["id", "status", "createdAt", "updatedAt", "completedAt", "failureCode"].sort())
      assert.deepEqual(await findMediaJobForOwner(id, fixture.owner.id, second), job)
    })

    await t.test("otro usuario y un UUID inexistente no devuelven datos", async () => {
      assert.equal(await findMediaJobForOwner(id, fixture.other.id), null)
      assert.equal(await findMediaJobForOwner(randomUUID(), fixture.owner.id), null)
    })

    await t.test("dos reservas simultáneas del mismo destino producen un éxito y un 409", async () => {
      const key = `team-avatar:${fixture.team.id}:${fixture.owner.id}`
      const input = { ownerId: fixture.owner.id, teamId: fixture.team.id, resourceKey: key }
      const results = await Promise.allSettled([registerReceivingMediaJob(input), registerReceivingMediaJob(input)])
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
      const rejected = results.find((result) => result.status === "rejected")
      assert.ok(rejected?.status === "rejected")
      assert.ok(rejected.reason instanceof AppError)
      assert.equal(rejected.reason.statusCode, 409)
      assert.equal(await prisma.mediaJob.count({ where: { resourceKey: key } }), 1)
    })

    await t.test("el alcance de equipo se conserva sin modificar membresías", async () => {
      const job = await registerReceivingMediaJob({ ownerId: fixture.owner.id, teamId: fixture.team.id, resourceKey: `team-logo:${fixture.team.id}` })
      const stored = await second.mediaJob.findUniqueOrThrow({ where: { id: job.id } })
      assert.equal(stored.teamId, fixture.team.id)
      assert.equal(stored.ownerId, fixture.owner.id)
      assert.equal(await findMediaJobForOwner(job.id, fixture.other.id), null)
    })

    await t.test("PostgreSQL impide liberar la clave de un trabajo que sigue activo", async () => {
      await assert.rejects(
        verifier.query('UPDATE "MediaJob" SET "activeResourceKey" = NULL WHERE id = $1', [id]),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_active_resource_consistency",
      )
      assert.equal((await prisma.mediaJob.findUniqueOrThrow({ where: { id } })).activeResourceKey, resourceKey)
    })

    await t.test("un estado terminal coherente libera el destino conservando el registro anterior", async () => {
      // 📚 Solo esta fixture: no hay ejecutor ni imagen asociados. Simulamos fallo
      // 📚 confirmado para verificar el CHECK; no es una función real de cancelación.
      await verifier.query('UPDATE "MediaJob" SET status = $1, "activeResourceKey" = NULL, "completedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP, "failureCode" = $2 WHERE id = $3', ["FAILED", "PROBE_FAILURE", id])
      assert.equal((await findMediaJobForOwner(id, fixture.owner.id))?.status, "FAILED")
      const next = await registerReceivingMediaJob({ ownerId: fixture.owner.id, resourceKey })
      assert.notEqual(next.id, id)
      assert.equal(next.status, "RECEIVING")
      assert.equal(await prisma.mediaJob.count({ where: { resourceKey } }), 2)
    })

    await t.test("la FK impide borrar un propietario con trabajos referidos", async () => {
      await assert.rejects(prisma.user.delete({ where: { id: fixture.owner.id } }), (error: unknown) =>
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
    })
  } finally {
    // 📚 Limpieza scoped: ni deleteMany vacío ni seed. Primero retiramos relaciones
    // 📚 de fixtures; los usuarios y equipos preexistentes permanecen intactos.
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
