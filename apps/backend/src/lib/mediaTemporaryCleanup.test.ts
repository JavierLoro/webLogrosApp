import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { test } from "node:test"
import type { PrismaClient } from "@prisma/client"
import { cleanupTerminalMediaJobTemporaryFiles } from "./mediaTemporaryCleanup"

const JOB_ID = "2f1d6e27-8165-4e2b-9c96-6854ee05ce71"
const OWNER_ID = "e57e21a6-e8c5-4b27-aad9-29ddc94fdc65"
const RECEIPT = "f8d536f9-e110-450f-84cd-742ee91374dc"

type FakeJob = {
  id: string; ownerId: number; teamId: number; resourceKey: string; status: "INTERRUPTED"
  runtimeOwnerId: string | null; receiptToken: string | null; inputDirectory: string | null
  resultDirectory: string | null; workerDirectory: string | null; cleanupPendingDirectory: string | null
  temporaryCleanedAt: Date | null
}

function cleanupDatabase(job: FakeJob): PrismaClient {
  return {
    mediaJob: {
      async findUnique() { return { ...job } },
      async updateMany({ where, data }: { where: Record<string, unknown>; data: Partial<FakeJob> }) {
        if (Object.entries(where).some(([key, value]) => (job as unknown as Record<string, unknown>)[key] !== value)) return { count: 0 }
        Object.assign(job, data)
        return { count: 1 }
      },
    },
  } as unknown as PrismaClient
}

function baseJob(inputDirectory: string | null, cleanupPendingDirectory: string | null = null): FakeJob {
  return {
    id: JOB_ID, ownerId: 17, teamId: 4, resourceKey: "test:recovery", status: "INTERRUPTED",
    runtimeOwnerId: OWNER_ID, receiptToken: RECEIPT, inputDirectory, resultDirectory: null,
    workerDirectory: null, cleanupPendingDirectory, temporaryCleanedAt: null,
  }
}

async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const base = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(base, "media-temp-cleanup-test-")))
  try { await run(root) }
  finally {
    assert.equal(dirname(root), base)
    assert.ok(root.startsWith(join(base, "media-temp-cleanup-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true, force: true })
  }
}

test("a dead owned receipt can discover variants created before onSpawn recorded them", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ID)
    const orphanVariants = join(directory, "variants-abc123")
    await mkdir(orphanVariants, { recursive: true })
    await writeFile(join(directory, ".receipt-owner.json"), JSON.stringify({
      jobId: JOB_ID, runtimeOwnerId: OWNER_ID, receiptToken: RECEIPT,
    }), { mode: 0o600 })
    await writeFile(join(orphanVariants, "image-640x640.png"), Buffer.from("variant"))
    // 📚 El receptor persiste inputDirectory antes de crear el workspace; la ventana real es variants-* creada antes del CAS de onSpawn.
    const job = baseJob(directory)

    const result = await cleanupTerminalMediaJobTemporaryFiles(JOB_ID, root, cleanupDatabase(job), {
      ownerAndWorkerDeadConfirmed: true,
    })

    assert.equal(result.cleaned, true)
    await assert.rejects(readdir(directory), { code: "ENOENT" })
    assert.ok(job.temporaryCleanedAt instanceof Date)
    assert.equal(job.cleanupPendingDirectory, null)
    // 📚 El sello de limpieza retira solo la ruta pendiente; el receipt histórico conserva sus constraints de DB.
    assert.equal(job.inputDirectory, directory)
    assert.equal(job.receiptToken, RECEIPT)
  })
})

test("unknown files in an orphan variants directory remain quarantined", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ID)
    const orphanVariants = join(directory, "variants-foreign")
    await mkdir(orphanVariants, { recursive: true })
    await writeFile(join(directory, ".receipt-owner.json"), JSON.stringify({
      jobId: JOB_ID, runtimeOwnerId: OWNER_ID, receiptToken: RECEIPT,
    }), { mode: 0o600 })
    await writeFile(join(orphanVariants, "keep-me.txt"), "unknown")
    const job = baseJob(null)

    const result = await cleanupTerminalMediaJobTemporaryFiles(JOB_ID, root, cleanupDatabase(job), {
      ownerAndWorkerDeadConfirmed: true,
    })

    assert.equal(result.cleaned, false)
    assert.equal((await readdir(directory)).includes(".receipt-owner.json"), true)
    assert.equal(await readFile(join(orphanVariants, "keep-me.txt"), "utf8"), "unknown")
    assert.equal(job.temporaryCleanedAt, null)
  })
})

test("a foreign receipt marker preserves the input directory", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ID)
    await mkdir(directory)
    await writeFile(join(directory, ".receipt-owner.json"), JSON.stringify({
      jobId: JOB_ID, runtimeOwnerId: OWNER_ID, receiptToken: "another-receipt",
    }), { mode: 0o600 })
    await writeFile(join(directory, "input.tmp"), "preserve")
    const job = baseJob(directory)

    const result = await cleanupTerminalMediaJobTemporaryFiles(JOB_ID, root, cleanupDatabase(job), {
      ownerAndWorkerDeadConfirmed: true,
    })

    assert.equal(result.cleaned, false)
    assert.equal(await readFile(join(directory, "input.tmp"), "utf8"), "preserve")
    assert.ok((await readdir(directory)).includes(".receipt-owner.json"))
    assert.equal(job.inputDirectory, directory)
    assert.equal(job.temporaryCleanedAt, null)
  })
})

test("a missing marker does not authorize deleting a known input path", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ID)
    await mkdir(directory)
    await writeFile(join(directory, "input.tmp"), "preserve")
    const job = baseJob(directory)

    const result = await cleanupTerminalMediaJobTemporaryFiles(JOB_ID, root, cleanupDatabase(job), {
      ownerAndWorkerDeadConfirmed: true,
    })

    assert.equal(result.cleaned, false)
    assert.equal(await readFile(join(directory, "input.tmp"), "utf8"), "preserve")
    assert.deepEqual(await readdir(directory), ["input.tmp"])
    assert.equal(job.inputDirectory, directory)
    assert.equal(job.temporaryCleanedAt, null)
  })
})

test("an empty directory after marker unlink can finish an exact pending rmdir", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ID)
    await mkdir(directory)
    const job = baseJob(directory, directory)

    const result = await cleanupTerminalMediaJobTemporaryFiles(JOB_ID, root, cleanupDatabase(job))

    assert.equal(result.cleaned, true)
    await assert.rejects(realpath(directory), { code: "ENOENT" })
    assert.ok(job.temporaryCleanedAt instanceof Date)
    assert.equal(job.cleanupPendingDirectory, null)
    assert.equal(job.inputDirectory, directory)
  })
})
