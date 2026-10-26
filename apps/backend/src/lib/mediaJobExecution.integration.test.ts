import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"
import { tmpdir } from "node:os"
import { test } from "node:test"
import { Prisma, PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import sharp from "sharp"
import type { executeMediaImage as ExecuteMediaImage } from "./mediaImageExecutor"
import { DATABASE_URL } from "../config/env"
import { AppError } from "../errors/AppError"
import { claimNextQueuedMediaJob, type ClaimedMediaJob } from "./mediaJobClaims"
import { executeClaimedMediaJob } from "./mediaJobExecution"
import prisma from "./prisma"

// 📚 El módulo CommonJS se instrumenta solo durante subtests secuenciales; la
// 📚 función real sigue ejecutando Sharp y el wrapper solo controla el instante del abort.
const mediaImageExecutorModule = require("./mediaImageExecutor") as {
  executeMediaImage: typeof ExecuteMediaImage
}

// 📚 Los artefactos son imágenes sintéticas y directorios únicos de la prueba;
// 📚 ningún caso modifica archivos de producto ni consume trabajos anteriores.
async function prepareInput(root: string, id: string, bytes: Buffer, previous = false): Promise<string> {
  const directory = join(root, id)
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await writeFile(join(directory, "input.tmp"), bytes)
  if (previous) {
    await mkdir(join(directory, "variants-previous"))
    await writeFile(join(directory, "variants-previous", "keep.txt"), "previous")
  }
  return directory
}

// 📚 El cierre del proceso se comprueba con el PID observado en started/transforming,
// 📚 no con ChildProcess.killed, que solo dice que se envió una señal.
function assertWorkerStopped(pid: number): void {
  assert.ok(pid > 0)
  assert.throws(() => process.kill(pid, 0), (error: unknown) =>
    error instanceof Error && "code" in error && error.code === "ESRCH")
}

// 📚 La falla inyectada se limita al segundo UPDATE del servicio: deja pasar el CAS
// 📚 de inicio y simula únicamente que PostgreSQL no confirma la entrega del resultado.
function clientWithUpdateManyHook(
  hook: (call: number) => "continue" | "fail" | void,
): PrismaClient {
  let call = 0
  const delegate = new Proxy(prisma.mediaJob, {
    get(target, property) {
      if (property === "updateMany") {
        return async (args: Prisma.MediaJobUpdateManyArgs) => {
          // 📚 Este fault sigue dirigido al inicio/entrega del resultado. Registrar
          // 📚 el PID añadió otra escritura, que aquí dejamos pasar sin cambiar el escenario.
          if (typeof args.data.workerPid === "number") return target.updateMany(args)
          call += 1
          if (hook(call) === "fail") throw new Error("integration-only database failure")
          return target.updateMany(args)
        }
      }
      const value = Reflect.get(target, property, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  })
  return new Proxy(prisma, {
    get(target, property) {
      if (property === "mediaJob") return delegate
      const value = Reflect.get(target, property, target)
      return typeof value === "function" ? value.bind(target) : value
    },
  }) as PrismaClient
}

// 📚 Opt-in y guard de destino evitan que un test consuma trabajos de otro ensayo.
test("ejecución one-shot de un trabajo reclamado", { skip: process.env.MEDIA_JOB_EXECUTION_TEST !== "1" }, async (t) => {
  const target = new URL(DATABASE_URL)
  assert.equal(target.hostname, "127.0.0.1")
  assert.equal(target.port, "55437")
  assert.equal(target.pathname, "/weblogros_ui")

  const verifierClient = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) })
  const verifier = new Pool({ connectionString: DATABASE_URL })
  t.after(async () => { await Promise.all([verifierClient.$disconnect(), verifier.end(), prisma.$disconnect()]) })
  const counts = async () => ({
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    memberships: await prisma.teamMembership.count(),
    achievements: await prisma.logro.count(),
    jobs: await prisma.mediaJob.count(),
  })
  const before = await counts()
  const preexistingJobs = await prisma.mediaJob.count({ where: { status: { in: ["QUEUED", "PROCESSING", "PUBLISHING"] } } })
  assert.equal(preexistingJobs, 0, "la base aislada debe estar libre de trabajos ajenos reclamables o activos")

  const run = randomUUID()
  const fixture = await prisma.$transaction(async (tx) => {
    const owner = await tx.user.create({ data: { email: `media-execution-${run}@example.invalid`, password: "integration-only-no-login" } })
    const team = await tx.team.create({ data: { nombre: "Media Execution Probe", slug: `media-execution-${run}` } })
    await tx.teamMembership.create({ data: { userId: owner.id, teamId: team.id, role: "TEAM_ADMIN" } })
    const jobs: Array<{ id: string }> = []
    for (let index = 0; index < 11; index += 1) {
      jobs.push(await tx.mediaJob.create({
        data: {
          ownerId: owner.id,
          teamId: team.id,
          resourceKey: `execution-probe:${run}:${index}`,
          activeResourceKey: `execution-probe:${run}:${index}`,
          status: "QUEUED",
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
          queuedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
          queueExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
        },
        select: { id: true },
      }))
    }
    return { owner, team, jobs }
  })

  let rootDirectory: string | null = null
  const claimedIds = new Set<string>()
  const claimJob = async (expectedId: string): Promise<ClaimedMediaJob> => {
    const claim = await claimNextQueuedMediaJob()
    assert.ok(claim)
    assert.equal(claim.id, expectedId)
    claimedIds.add(claim.id)
    return claim
  }
  const releaseProbe = async (id: string): Promise<void> => {
    await verifier.query(
      'UPDATE "MediaJob" SET status = $1, "activeResourceKey" = NULL, "processingSlot" = NULL, "completedAt" = clock_timestamp(), "failureCode" = COALESCE("failureCode", $2) WHERE id = $3 AND status IN ($4, $5)',
      ["FAILED", "PROBE_CLEANUP", id, "PROCESSING", "PUBLISHING"],
    )
  }

  try {
    const parent = await realpath(tmpdir())
    rootDirectory = await realpath(await mkdtemp(join(parent, "media-job-execution-")))
    const jpeg = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "navy" } }).jpeg().toBuffer()

    await t.test("Sharp cerrado persiste manifiesto privado en PUBLISHING y conserva la reserva", async () => {
      const claim = await claimJob(fixture.jobs[0].id)
      await prepareInput(rootDirectory!, claim.id, jpeg)
      let pid = 0
      const result = await executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
        onPhase: (event) => { pid = event.pid },
      }, clientWithUpdateManyHook((call) => {
        if (call === 2) assertWorkerStopped(pid)
      }))
      assert.equal(result.status, "PUBLISHING")
      assert.equal(result.cancellation, "none")
      assertWorkerStopped(pid)

      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PUBLISHING")
      assert.equal(stored.processingSlot, claim.slot)
      assert.equal(stored.activeResourceKey, claim.resourceKey)
      assert.equal(stored.completedAt, null)
      assert.equal(stored.executorStartedAt instanceof Date, true)
      assert.equal(stored.imageKind, "achievement")
      assert.equal(stored.inputDirectory, join(rootDirectory!, claim.id))
      assert.ok(stored.resultManifest && typeof stored.resultManifest === "object")
      assert.equal("outputDirectory" in stored.resultManifest, false)
      assert.equal(stored.resultDirectory?.startsWith(join(rootDirectory!, claim.id, "variants-")), true)
      await releaseProbe(claim.id)
    })

    await t.test("token obsoleto no arranca Sharp ni altera la toma vigente", async () => {
      const claim = await claimJob(fixture.jobs[1].id)
      await prepareInput(rootDirectory!, claim.id, jpeg)
      let pid = 0
      await assert.rejects(
        executeClaimedMediaJob({ ...claim, executionToken: randomUUID() }, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
          onPhase: (event) => { pid = event.pid },
        }),
        (error: unknown) => error instanceof AppError && error.statusCode === 409,
      )
      assert.equal(pid, 0)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PROCESSING")
      assert.equal(stored.executorStartedAt, null)
      assert.equal(stored.imageKind, null)
      assert.equal(stored.inputDirectory, null)
      await releaseProbe(claim.id)
    })

    await t.test("dos llamadas para una toma producen un solo worker", async () => {
      const claim = await claimJob(fixture.jobs[2].id)
      await prepareInput(rootDirectory!, claim.id, jpeg)
      const pids = new Set<number>()
      const options = { onPhase: (event: { pid: number }) => { pids.add(event.pid) } }
      const results = await Promise.allSettled([
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, options),
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, options),
      ])
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1)
      const rejected = results.find((result) => result.status === "rejected")
      assert.ok(rejected?.status === "rejected")
      assert.ok(rejected.reason instanceof AppError)
      assert.equal(rejected.reason.statusCode, 409)
      assert.equal(pids.size, 1)
      for (const pid of pids) assertWorkerStopped(pid)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PUBLISHING")
      await releaseProbe(claim.id)
    })

    await t.test("imagen inválida queda FAILED y libera puesto y destino", async () => {
      const claim = await claimJob(fixture.jobs[3].id)
      await prepareInput(rootDirectory!, claim.id, Buffer.from("not an image"))
      let pid = 0
      await assert.rejects(
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "logo" }, {
          onPhase: (event) => { pid = event.pid },
        }),
        (error: unknown) => error instanceof AppError && error.statusCode === 422,
      )
      assertWorkerStopped(pid)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "FAILED")
      assert.equal(stored.failureCode, "UNSUPPORTED_FORMAT")
      assert.equal(stored.processingSlot, null)
      assert.equal(stored.activeResourceKey, null)
      assert.ok(stored.completedAt)
    })

    await t.test("cancelar en transformación espera el cierre y conserva entrada/variantes previas", async () => {
      const claim = await claimJob(fixture.jobs[4].id)
      const largeImage = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "orange" } }).jpeg().toBuffer()
      const directory = await prepareInput(rootDirectory!, claim.id, largeImage, true)
      const controller = new AbortController()
      let pid = 0
      await assert.rejects(
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
          signal: controller.signal,
          onPhase: (event) => {
            pid = event.pid
            if (event.phase === "transforming") controller.abort()
          },
        }),
        (error: unknown) => error instanceof AppError && error.statusCode === 409,
      )
      assertWorkerStopped(pid)
      assert.deepEqual((await readdir(directory)).sort(), ["input.tmp", "variants-previous"])
      assert.deepEqual(await readFile(join(directory, "input.tmp")), largeImage)
      assert.equal(await readFile(join(directory, "variants-previous", "keep.txt"), "utf8"), "previous")
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "CANCELED")
      assert.equal(stored.processingSlot, null)
      assert.equal(stored.activeResourceKey, null)
    })

    await t.test("timeout termina en FAILED después de cerrar el worker", async () => {
      const claim = await claimJob(fixture.jobs[5].id)
      const timeoutImage = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: "purple" } }).jpeg().toBuffer()
      await prepareInput(rootDirectory!, claim.id, timeoutImage)
      let pid = 0
      await assert.rejects(
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
          processingTimeoutMs: 1,
          onPhase: (event) => { pid = event.pid },
        }),
        (error: unknown) => error instanceof AppError && error.statusCode === 422,
      )
      assertWorkerStopped(pid)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "FAILED")
      assert.equal(stored.failureCode, "PROCESSING_TIMEOUT")
      assert.equal(stored.processingSlot, null)
    })

    await t.test("si PUBLISHING gana la carrera local, la cancelación se informa too_late", async () => {
      const claim = await claimJob(fixture.jobs[6].id)
      await prepareInput(rootDirectory!, claim.id, jpeg)
      const controller = new AbortController()
      let pid = 0
      const db = clientWithUpdateManyHook((call) => {
        if (call === 2) {
          assertWorkerStopped(pid)
          controller.abort()
        }
      })
      const result = await executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
        signal: controller.signal,
        onPhase: (event) => { pid = event.pid },
      }, db)
      assertWorkerStopped(pid)
      assert.equal(result.status, "PUBLISHING")
      assert.equal(result.cancellation, "too_late")
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PUBLISHING")
      await releaseProbe(claim.id)
    })

    await t.test("fallo al persistir PUBLISHING conserva reserva y archivos para recuperación", async () => {
      const claim = await claimJob(fixture.jobs[7].id)
      const directory = await prepareInput(rootDirectory!, claim.id, jpeg)
      let pid = 0
      const db = clientWithUpdateManyHook((call) => call === 2 ? "fail" : "continue")
      await assert.rejects(
        executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
          onPhase: (event) => { pid = event.pid },
        }, db),
        (error: unknown) => error instanceof AppError && error.statusCode === 503
          && !error.message.includes(directory),
      )
      assertWorkerStopped(pid)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PROCESSING")
      assert.equal(stored.processingSlot, claim.slot)
      assert.equal(stored.activeResourceKey, claim.resourceKey)
      assert.ok(stored.executorStartedAt)
      assert.equal(stored.resultDirectory, null)
      assert.equal(stored.resultManifest, null)
      assert.ok((await readdir(directory)).some((entry) => entry.startsWith("variants-")))
      await releaseProbe(claim.id)
    })

    await t.test("abort tras cierre real de Sharp confirma CANCELED y limpia solo el intento", async () => {
      const claim = await claimJob(fixture.jobs[8].id)
      const directory = await prepareInput(rootDirectory!, claim.id, jpeg, true)
      const controller = new AbortController()
      const original = mediaImageExecutorModule.executeMediaImage
      mediaImageExecutorModule.executeMediaImage = async (...args: Parameters<typeof original>) => {
        const result = await original(...args)
        controller.abort()
        return result
      }
      let pid = 0
      try {
        await assert.rejects(
          executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
            signal: controller.signal,
            onPhase: (event) => { pid = event.pid },
          }),
          (error: unknown) => error instanceof AppError && error.statusCode === 409,
        )
      } finally {
        mediaImageExecutorModule.executeMediaImage = original
      }
      assertWorkerStopped(pid)
      assert.deepEqual((await readdir(directory)).sort(), ["input.tmp", "variants-previous"])
      assert.deepEqual(await readFile(join(directory, "input.tmp")), jpeg)
      assert.equal(await readFile(join(directory, "variants-previous", "keep.txt"), "utf8"), "previous")
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "CANCELED")
      assert.equal(stored.processingSlot, null)
      assert.equal(stored.activeResourceKey, null)
      assert.equal(stored.cleanupPendingDirectory, null)
    })

    await t.test("fallo del CAS de cancelación post-Sharp conserva PROCESSING, reserva y variantes", async () => {
      const claim = await claimJob(fixture.jobs[9].id)
      const directory = await prepareInput(rootDirectory!, claim.id, jpeg)
      const controller = new AbortController()
      const original = mediaImageExecutorModule.executeMediaImage
      mediaImageExecutorModule.executeMediaImage = async (...args: Parameters<typeof original>) => {
        const result = await original(...args)
        controller.abort()
        return result
      }
      const db = clientWithUpdateManyHook((call) => call === 2 ? "fail" : "continue")
      let pid = 0
      try {
        await assert.rejects(
          executeClaimedMediaJob(claim, { temporaryRoot: rootDirectory!, kind: "achievement" }, {
            signal: controller.signal,
            onPhase: (event) => { pid = event.pid },
          }, db),
          (error: unknown) => error instanceof AppError && error.statusCode === 503,
        )
      } finally {
        mediaImageExecutorModule.executeMediaImage = original
      }
      assertWorkerStopped(pid)
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PROCESSING")
      assert.equal(stored.processingSlot, claim.slot)
      assert.equal(stored.activeResourceKey, claim.resourceKey)
      assert.equal(stored.resultDirectory, null)
      assert.equal(stored.cleanupPendingDirectory, null)
      const attempts = (await readdir(directory)).filter((entry) => entry.startsWith("variants-"))
      assert.equal(attempts.length, 1)
      assert.ok((await readdir(join(directory, attempts[0]))).length > 0)
      await releaseProbe(claim.id)
    })

    await t.test("PostgreSQL rechaza PUBLISHING sin manifiesto y conserva PROCESSING", async () => {
      const claim = await claimJob(fixture.jobs[10].id)
      await assert.rejects(
        verifier.query(
          'UPDATE "MediaJob" SET status = $1, "executorStartedAt" = clock_timestamp(), "imageKind" = $2, "inputDirectory" = $3 WHERE id = $4',
          ["PUBLISHING", "achievement", "/tmp/claim-fixture/input", claim.id],
        ),
        (error: unknown) => (error as { code?: string; constraint?: string }).code === "23514"
          && (error as { constraint?: string }).constraint === "MediaJob_result_manifest_consistency",
      )
      const stored = await verifierClient.mediaJob.findUniqueOrThrow({ where: { id: claim.id } })
      assert.equal(stored.status, "PROCESSING")
      assert.equal(stored.executorStartedAt, null)
      assert.equal(stored.imageKind, null)
      await releaseProbe(claim.id)
    })
  } finally {
    // 📚 Nunca se limpia por un WHERE vacío: primero soltamos solo los UUIDs de esta prueba.
    for (const { id } of fixture.jobs) await releaseProbe(id)
    if (rootDirectory) {
      const rootInfo = await lstat(rootDirectory)
      const parent = await realpath(tmpdir())
      assert.ok(rootDirectory.startsWith(join(parent, "media-job-execution-")))
      assert.equal(dirname(rootDirectory), parent)
      assert.ok(rootInfo.isDirectory() && !rootInfo.isSymbolicLink())
      assert.equal(await realpath(rootDirectory), rootDirectory)
      await rm(rootDirectory, { recursive: true, force: false })
    }
    await prisma.$transaction(async (tx) => {
      await tx.mediaJob.deleteMany({ where: { id: { in: fixture.jobs.map(({ id }) => id) } } })
      await tx.teamMembership.deleteMany({ where: { teamId: fixture.team.id } })
      await tx.team.delete({ where: { id: fixture.team.id } })
      await tx.user.delete({ where: { id: fixture.owner.id } })
    })
    const after = await counts()
    assert.deepEqual(after, before)
    t.diagnostic(JSON.stringify({ before, after, fixturesRemoved: true, claimedIds: [...claimedIds] }))
  }
})
