import assert from "node:assert/strict"
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { measureDirectoryBytes, readWorkerMetrics } from "./metrics"

test("un directorio temporal ausente mide cero y no produce muestras", async () => {
  const missing = path.join(os.tmpdir(), `media-benchmark-missing-${process.pid}-${Date.now()}`)
  assert.deepEqual(await measureDirectoryBytes(missing), { bytes: 0, files: 0, directories: 0 })
  assert.deepEqual(await readWorkerMetrics(missing), [])
})

test("mide archivos recursivos y rechaza enlaces simbólicos", async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "media-benchmark-metrics-"))
  const root = path.join(temporaryRoot, "measured")
  const outside = path.join(temporaryRoot, "outside.bin")
  try {
    await mkdir(root)
    await mkdir(path.join(root, "nested"))
    await writeFile(path.join(root, "a.bin"), Buffer.alloc(7))
    await writeFile(path.join(root, "nested", "b.bin"), Buffer.alloc(11))
    assert.deepEqual(await measureDirectoryBytes(root), { bytes: 18, files: 2, directories: 1 })
    await writeFile(outside, Buffer.alloc(100))
    try {
      await symlink(outside, path.join(root, "linked"))
    } catch {
      t.skip("El sistema no permite crear enlaces simbólicos en esta cuenta")
      return
    }
    await assert.rejects(measureDirectoryBytes(root), /SYMLINK_IN_MEASURED_DIRECTORY/)
  } finally {
    // 📚 La limpieza recursiva queda limitada a la carpeta temporal que acabamos
    // 📚 de crear; el archivo exterior al árbol medido también se limpia aquí.
    const safeBase = path.resolve(os.tmpdir()) + path.sep
    const cleanupTarget = path.resolve(temporaryRoot)
    assert.ok(cleanupTarget.toLowerCase().startsWith(safeBase.toLowerCase()))
    assert.notEqual(cleanupTarget, path.parse(cleanupTarget).root)
    await rm(cleanupTarget, { recursive: true, force: true })
  }
})

test("lee solo snapshots válidos y ordena por PID y fecha", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "media-benchmark-workers-"))
  try {
    const valid = (pid: number, at: string) => ({
      pid, attempt: "123e4567-e89b-42d3-a456-426614174000", jobId: "123e4567-e89b-42d3-a456-426614174000", startedAt: "2026-01-01T00:00:00.000Z", at,
      memory: { rss: 10, heapUsed: 5, external: 2, arrayBuffers: 1 }, peakRssBytes: 10,
      cpu: { user: 2, system: 1 }, resourceUsageMaxRssBytes: 10,
    })
    await writeFile(path.join(root, "worker-20-123e4567-e89b-42d3-a456-426614174000.json"), JSON.stringify(valid(20, "2026-01-01T00:00:02.000Z")))
    await writeFile(path.join(root, "worker-10-123e4567-e89b-42d3-a456-426614174000.json"), JSON.stringify(valid(10, "2026-01-01T00:00:03.000Z")))
    await writeFile(path.join(root, "worker-10-123e4567-e89b-42d3-a456-426614174001.json"), JSON.stringify(valid(10, "2026-01-01T00:00:04.000Z")))
    await writeFile(path.join(root, "worker-30-123e4567-e89b-42d3-a456-426614174002.json"), "{")
    await writeFile(path.join(root, "unrelated.json"), JSON.stringify(valid(1, "2026-01-01T00:00:00.000Z")))
    const result = await readWorkerMetrics(root)
    assert.deepEqual(result.map(({ pid, at }) => [pid, at]), [
      [10, "2026-01-01T00:00:03.000Z"], [10, "2026-01-01T00:00:04.000Z"], [20, "2026-01-01T00:00:02.000Z"],
    ])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
