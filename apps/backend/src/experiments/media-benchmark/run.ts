import { spawn, fork, type ChildProcess } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import { mkdir, mkdtemp, readFile, realpath, rm, statfs, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, resolve } from "node:path"
import { createInterface } from "node:readline"
import { request as httpRequest } from "node:http"
import { parseArgs } from "node:util"
import dotenv from "dotenv"
import { dockerConfiguration, environmentSnapshot, measureDirectoryBytes, readWorkerMetrics, sampleDockerMetrics, type WorkerMetric } from "./metrics"
import type { BenchmarkCorpusEntry } from "./corpus"
import { completeWorkerLifecycle, type WorkerEvent } from "./analysis"

type RecordValue = Record<string, any>
const sleep = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))
const MiB = 1024 ** 2
const terminal = new Set(["SUCCEEDED", "FAILED", "CANCELED", "INTERRUPTED"])
const ms = (date: string | null) => date ? Date.parse(date) : NaN
const percentile = (values: number[], p: number): number | null => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  return sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] : null
}
function assert(condition: unknown, code: string): asserts condition { if (!condition) throw new Error(code) }

// El runner genera tráfico desde otro proceso: su FormData y el corpus no inflan
// la memoria del backend/Sharp. Los comandos privados nunca llegan al API público.
async function main(): Promise<void> {
  const { values } = parseArgs({ options: {
    "env-file": { type: "string", multiple: true }, database: { type: "string" }, bucket: { type: "string" },
    "allow-fixtures": { type: "boolean", default: false }, containers: { type: "string" },
    output: { type: "string" }, batches: { type: "string", default: "4" },
  } })
  assert(values.database && values.bucket && values["allow-fixtures"], "REQUIRE_DATABASE_BUCKET_AND_ALLOW_FIXTURES")
  const batches = Number(values.batches)
  assert(Number.isInteger(batches) && batches >= 3 && batches <= 20, "BATCHES_MUST_BE_3_TO_20")
  for (const file of values["env-file"] ?? []) assert(!dotenv.config({ path: resolve(file), override: true, quiet: true }).error, "ENV_FILE_UNREADABLE")
  const runId = randomUUID()
  const output = resolve(values.output ?? join(".bench-results", `${new Date().toISOString().replace(/[:.]/g, "-")}-${runId}`))
  await mkdir(output, { recursive: true })
  const parentTemp = await realpath(tmpdir())
  const root = await mkdtemp(join(parentTemp, "weblogros-media-benchmark-"))
  const mediaRoot = join(root, "media"), metricsRoot = join(root, "metrics"), corpusRoot = join(root, "corpus")
  for (const directory of [mediaRoot, metricsRoot, corpusRoot]) await mkdir(directory, { mode: 0o700 })
  const environment = await environmentSnapshot()
  const fs = await statfs(root)
  const containers = values.containers?.split(",").filter(Boolean) ?? []
  assert(containers.every((name) => /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(name)), "INVALID_CONTAINER_NAME")
  const containerConfiguration = await dockerConfiguration(containers)
  let phase = "setup", stopSampling = false, actor: ChildProcess | undefined, cleanup: RecordValue | undefined
  let ready: RecordValue | undefined, fatal = "", actorClosed = false, actorExited = false
  let actorExitCode: number | null = null, activeResourceCounts: RecordValue | undefined
  const actorSamples: RecordValue[] = [], diskSamples: RecordValue[] = [], dockerSamples: RecordValue[] = []
  const healthSamples: RecordValue[] = [], workerEvents: RecordValue[] = [], snapshots: RecordValue[] = []
  const workerLatest = new Map<string, WorkerMetric>()
  const waiting = new Map<string, { resolve(value: RecordValue): void; reject(error: Error): void; timer: NodeJS.Timeout }>()
  const uploads: RecordValue[] = [], stages: RecordValue[] = [], idle: RecordValue[] = []
  const loops: Promise<void>[] = []
  let corpus: BenchmarkCorpusEntry[] = [], sharpVersions: RecordValue = {}
  const startedAt = new Date().toISOString()
  const sourceHash = createHash("sha256")
  for (const name of ["mediaImageExecutor", "mediaImageWorker", "mediaJobClaims", "mediaRuntime", "mediaPublication"])
    sourceHash.update(await readFile(join(__dirname, "../../lib", `${name}.js`)))
  const command = (type: string, fields: RecordValue = {}, timeout = 30_000): Promise<RecordValue> => {
    assert(actor?.stdin?.writable, "ACTOR_NOT_WRITABLE")
    const requestId = randomUUID()
    return new Promise((resolveCommand, reject) => {
      const timer = setTimeout(() => { waiting.delete(requestId); reject(new Error(`ACTOR_${type.toUpperCase()}_TIMEOUT`)) }, timeout)
      waiting.set(requestId, { resolve: resolveCommand, reject, timer })
      actor!.stdin!.write(`${JSON.stringify({ type, requestId, ...fields })}\n`)
    })
  }
  const snapshot = async (): Promise<RecordValue> => {
    const value = await command("snapshot")
    const jobs: RecordValue[] = value.jobs
    value.at = new Date().toISOString(); value.phase = phase
    snapshots.push(value)
    assert(jobs.filter((job) => ["PROCESSING", "PUBLISHING"].includes(job.status)).length <= 2, "ACTIVE_LIMIT_EXCEEDED")
    assert(jobs.filter((job) => ["RECEIVING", "QUEUED"].includes(job.status)).length <= 10, "WAITING_LIMIT_EXCEEDED")
    return value
  }
  const until = async (test: (value: RecordValue) => boolean, timeout = 240_000): Promise<RecordValue> => {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      assert(!fatal, fatal || "ACTOR_FAILED")
      const value = await snapshot()
      if (test(value)) return value
      await sleep(200)
    }
    throw new Error("WORKLOAD_WAIT_TIMEOUT")
  }
  try {
    console.log("Generando corpus reproducible fuera del proceso medido...")
    const generator = fork(join(__dirname, "corpusProcess.js"), [], { execArgv: [], stdio: ["ignore", "ignore", "ignore", "ipc"] })
    let generated: RecordValue | undefined
    generator.on("message", (value) => { generated = value as RecordValue })
    generator.send({ directory: corpusRoot })
    const generatorCode = await new Promise<number | null>((done) => generator.once("close", done))
    assert(generatorCode === 0 && generated?.entries, "CORPUS_GENERATION_FAILED")
    corpus = generated.entries; sharpVersions = generated.versions
    const contents = await Promise.all(corpus.map((entry) => readFile(entry.path)))
    actor = spawn(process.execPath, [join(__dirname, "actor.js")], {
      env: { ...process.env, MEDIA_BENCHMARK_ALLOW_WRITES: "1" },
      stdio: ["pipe", "pipe", "pipe", "ipc"], windowsHide: true,
    } as import("node:child_process").SpawnOptions)
    actor.on("close", () => { actorClosed = true })
    actor.on("exit", (code) => { actorExited = true; actorExitCode = code })
    actor.on("message", (value) => { const event = value as RecordValue; if (event.type === "worker") workerEvents.push({ ...event, phase }) })
    createInterface({ input: actor.stdout! }).on("line", (line) => {
      let message: RecordValue
      try { message = JSON.parse(line) } catch { return }
      if (message.type === "ready") ready = message
      else if (message.type === "sample") actorSamples.push({ ...message, at: message.atISO, phase })
      else if (message.type === "error") fatal = /^[A-Z_]+$/.test(message.code) ? message.code : "ACTOR_FAILED"
      else if (message.requestId) {
        const pending = waiting.get(message.requestId)
        if (pending) { waiting.delete(message.requestId); clearTimeout(pending.timer); pending.resolve(message) }
      }
    })
    actor.stderr!.resume() // No volcar errores con URLs/credenciales al informe.
    actor.stdin!.write(`${JSON.stringify({ type: "start", runId, temporaryRoot: mediaRoot, metricsRoot,
      expectedDatabase: values.database, expectedBucket: values.bucket, origin: "http://localhost:3000" })}\n`)
    const startupDeadline = Date.now() + 45_000
    while (!ready && !fatal && !actorClosed && Date.now() < startupDeadline) await sleep(100)
    assert(ready, fatal || "ACTOR_START_TIMEOUT")
    const session = ready
    const emptyMedia = await measureDirectoryBytes(mediaRoot)
    console.log("Backend aislado listo. Midiendo reposo, concurrencia, cola y tandas...")
    loops.push((async () => {
      while (!stopSampling) {
        const at = new Date().toISOString(), currentPhase = phase
        for (const metric of await readWorkerMetrics(metricsRoot)) workerLatest.set(metric.attempt, metric)
        const current = [...workerLatest.values()].filter((m) => !m.final && Date.now() - ms(m.at) < 1000
          && !workerEvents.some((event) => event.attempt === m.attempt && event.event === "close"))
        const disk = await measureDirectoryBytes(mediaRoot)
        diskSamples.push({ at, phase: currentPhase, ...disk, workerRssBytes: current.reduce((sum, m) => sum + m.memory.rss, 0), workerCount: current.length })
        await sleep(100)
      }
    })().catch(() => { fatal ||= "DIRECTORY_SAMPLING_FAILED" }))
    if (containers.length) loops.push((async () => {
      while (!stopSampling) { const at = new Date().toISOString(), label = phase; const metrics = await sampleDockerMetrics(containers); dockerSamples.push({ at, finishedAt: new Date().toISOString(), phase: label, ...metrics }); await sleep(500) }
    })())
    loops.push((async () => {
      while (!stopSampling) {
        const at = new Date().toISOString(), label = phase, started = performance.now()
        try {
          const response = await fetch(`${session.baseUrl}/health`, { signal: AbortSignal.timeout(5000) })
          await response.arrayBuffer()
          healthSamples.push({ at, phase: label, milliseconds: performance.now() - started, status: response.status })
        } catch { healthSamples.push({ at, phase: label, milliseconds: performance.now() - started, status: 0 }) }
        await sleep(250)
      }
    })())
    const upload = async (index: number, formatIndex: number, expected = 202): Promise<string> => {
      const form = new FormData()
      form.append("image", new Blob([new Uint8Array(contents[formatIndex])], { type: corpus[formatIndex].format === "jpeg" ? "image/jpeg" : "image/png" }), basename(corpus[formatIndex].path))
      const start = performance.now()
      const response = await fetch(`${session.baseUrl}/equipos/${session.teamSlug}/logros/${session.achievementIds[index]}/imagen`, {
        method: "POST", headers: { Cookie: session.cookie, Origin: "http://localhost:3000" }, body: form, signal: AbortSignal.timeout(40_000),
      })
      const body = await response.json() as RecordValue
      uploads.push({ phase, status: response.status, milliseconds: performance.now() - start, corpus: corpus[formatIndex].name, jobId: body.job?.id })
      assert(response.status === expected, `UPLOAD_EXPECTED_${expected}_GOT_${response.status}`)
      return body.job?.id ?? "rejected"
    }
    const complete = async (ids: string[]): Promise<RecordValue> => until((value) => {
      const jobs = value.jobs.filter((job: RecordValue) => ids.includes(job.id))
      if (jobs.some((job: RecordValue) => terminal.has(job.status) && job.status !== "SUCCEEDED")) throw new Error("JOB_DID_NOT_SUCCEED")
      return jobs.length === ids.length && jobs.every((job: RecordValue) => job.status === "SUCCEEDED")
    })
    const settle = async (label: string): Promise<void> => {
      await until((value) => value.counts.pendingCleanupCount === 0)
      const deadline = Date.now() + 15_000
      while ((await measureDirectoryBytes(mediaRoot)).files !== emptyMedia.files && Date.now() < deadline) await sleep(100)
      const settledMedia = await measureDirectoryBytes(mediaRoot)
      assert(settledMedia.files === emptyMedia.files && settledMedia.bytes === emptyMedia.bytes && settledMedia.directories === 0, "TEMPORARIES_REMAIN")
      await sleep(2000)
      const last = actorSamples[actorSamples.length - 1]
      idle.push({ label, rssBytes: last?.memory.rss, heapUsedBytes: last?.memory.heapUsed, at: last?.at })
    }
    phase = "baseline"; await sleep(3000)
    phase = "two_max"; let start = Date.now()
    const first = await Promise.all([upload(0, 0), upload(1, 1)])
    await complete(first); stages.push({ name: phase, jobs: 2, durationMs: Date.now() - start })
    phase = "idle_two_max"; await settle(phase)
    for (const formatIndex of [0, 1]) {
      phase = formatIndex === 0 ? "two_jpeg" : "two_png"; start = Date.now()
      const pair = await Promise.all([upload(0, formatIndex), upload(1, formatIndex)])
      await complete(pair); stages.push({ name: phase, jobs: 2, durationMs: Date.now() - start })
      phase = `idle_${phase}`; await settle(phase)
    }
    phase = "queue_hold"; await command("hold", { enabled: true })
    const held = await Promise.all([upload(0, 0), upload(1, 1)])
    await until((value) => value.jobs.filter((job: RecordValue) => ["PROCESSING", "PUBLISHING"].includes(job.status)).length === 2)
    const queued = await Promise.all(Array.from({ length: 10 }, (_, i) => upload(i + 2, i % 2)))
    await until((value) => value.counts.ownWaiting === 10)
    // La admisión rechaza por cabeceras antes de consumir el archivo. No enviamos
    // 10 MB contra un socket que el servidor cierra deliberadamente: fetch puede
    // convertir esa carrera de escritura/cierre en ECONNRESET antes de leer el 503.
    const rejectedAt = performance.now()
    const overflow = await new Promise<{ status: number; body: RecordValue }>((done, reject) => {
      const req = httpRequest(`${session.baseUrl}/equipos/${session.teamSlug}/logros/${session.achievementIds[12]}/imagen`, {
        method: "POST", headers: { Cookie: session.cookie, Origin: "http://localhost:3000",
          "Content-Type": "multipart/form-data; boundary=benchmark-overflow", "Content-Length": 10_000_200 },
      }, (res) => {
        let text = ""
        res.setEncoding("utf8")
        res.on("data", (chunk: string) => { text += chunk; if (text.length > 65536) req.destroy(new Error("OVERFLOW_RESPONSE_TOO_LARGE")) })
        res.on("error", reject)
        res.on("end", () => { try { done({ status: res.statusCode ?? 0, body: JSON.parse(text) }) } catch { reject(new Error("OVERFLOW_INVALID_RESPONSE")) } })
      })
      req.on("error", reject)
      req.setTimeout(5000, () => req.destroy(new Error("OVERFLOW_RESPONSE_TIMEOUT")))
      req.flushHeaders()
    })
    assert(overflow.status === 503, `OVERFLOW_EXPECTED_503_GOT_${overflow.status}`)
    assert(typeof overflow.body.error === "string" && overflow.body.error.toLowerCase().includes("cola"), "OVERFLOW_WAS_NOT_CAPACITY_REJECTION")
    uploads.push({ phase, status: overflow.status, milliseconds: performance.now() - rejectedAt, bodyBytesSent: 0, declaredFileBytes: 10_000_000 })
    stages.push({ name: "queue_hold", active: 2, waiting: 10, overflowStatus: 503, controlledGate: true })
    phase = "queue_work"; start = Date.now(); await command("release")
    await complete([...held, ...queued]); stages.push({ name: phase, jobs: 12, durationMs: Date.now() - start })
    phase = "idle_queue"; await settle(phase)
    for (let batch = 1; batch <= batches; batch++) {
      phase = `batch_${batch}`; start = Date.now()
      const ids = await Promise.all(Array.from({ length: 4 }, (_, i) => upload(i, i % 2)))
      await complete(ids); stages.push({ name: phase, jobs: 4, durationMs: Date.now() - start })
      phase = `idle_batch_${batch}`; await settle(phase)
      console.log(`Tanda ${batch}/${batches} completada y temporales retirados.`)
    }
    phase = "read_verification"
    const image = await fetch(`${session.baseUrl}/equipos/${session.teamSlug}/logros/${session.achievementIds[0]}/imagen?size=320`, { headers: { Cookie: session.cookie } })
    assert(image.status === 200 && (await image.arrayBuffer()).byteLength > 0, "ASSOCIATED_IMAGE_NOT_READABLE")
    const finalSnapshot = await snapshot()
    assert(finalSnapshot.readyReferences.filter((item: RecordValue) => item.imageAssetId && item.state === "READY").length === 12, "READY_REFERENCES_MISSING")
  } catch (error) {
    fatal = error instanceof Error && /^[A-Z_0-9]+$/.test(error.message) ? error.message : "BENCHMARK_EXECUTION_FAILED"
  } finally {
    stopSampling = true
    const samplingResults = await Promise.allSettled(loops)
    if (samplingResults.some((result) => result.status === "rejected")) fatal ||= "SAMPLING_FAILED"
    for (const metric of await readWorkerMetrics(metricsRoot)) workerLatest.set(metric.attempt, metric)
    if (ready && !actorClosed) {
      try {
        phase = "cleanup"
        const stopped = await command("stop", {}, 75_000)
        cleanup = stopped.cleanup; activeResourceCounts = stopped.activeResourceCounts
      } catch { fatal ||= "ACTOR_CLEANUP_FAILED" }
    }
    if (actor?.stdin?.writable && !actor.stdin.destroyed) actor.stdin.end()
    // El actor cierra su canal tras vaciar stdout; no desconectamos ambos extremos
    // a la vez. exit acredita muerte del proceso; close incluye también los pipes.
    const closeDeadline = Date.now() + 15_000
    while (actor && !actorClosed && Date.now() < closeDeadline) await sleep(100)
    if (actor && !actorExited) fatal ||= "ACTOR_STILL_ALIVE"
    else if (actor && !actorClosed) fatal ||= "ACTOR_STDIO_NOT_CLOSED"
    if (actorExited && actorExitCode !== 0) fatal ||= "ACTOR_EXIT_FAILED"
    for (const pending of waiting.values()) { clearTimeout(pending.timer); pending.reject(new Error("BENCHMARK_CLOSED")) }
  }
  const workers = [...workerLatest.values()]
  const lastSnapshot = snapshots[snapshots.length - 1]
  const jobs: RecordValue[] = lastSnapshot?.jobs ?? []
  const sharpDurations = workers.map((worker) => {
    const events = workerEvents.filter((event) => event.attempt === worker.attempt)
    return ms(events.find((event) => event.event === "processed")?.at) - ms(events.find((event) => event.event === "started")?.at)
  })
  // Sumar máximos de procesos secuenciales falsearía el pico. Este límite superior
  // solo suma high-water marks de workers cuyas vidas realmente se solaparon.
  const overlapUpperBoundBytes = Math.max(0, ...workerEvents.filter((event) => event.event === "spawn").map((event) => workers.filter((worker) => {
    const events = workerEvents.filter((e) => e.attempt === worker.attempt)
    return ms(events.find((e) => e.event === "spawn")?.at) <= ms(event.at)
      && ms(events.find((e) => e.event === "close")?.at) >= ms(event.at)
  }).reduce((sum, worker) => sum + worker.resourceUsageMaxRssBytes, 0)))
  const peakWorkerRssBytes = Math.max(0, ...diskSamples.map((s) => s.workerRssBytes))
  const peakBackendRssBytes = Math.max(0, ...actorSamples.map((s) => s.memory.rss))
  const peakTemporaryBytes = Math.max(0, ...diskSamples.map((s) => s.bytes))
  const containerSummary = containers.map((name) => {
    const samples = dockerSamples.flatMap((sample) => sample.samples).filter((sample) => sample.name === name && sample.memoryBytes !== null)
    return { name, samples: samples.length, peakMemoryBytes: Math.max(0, ...samples.map((s) => s.memoryBytes)), peakCpuPercent: Math.max(0, ...samples.map((s) => s.cpuPercent)) }
  })
  const cleanupPassed = !!cleanup && !cleanup.errors.length && JSON.stringify(cleanup.before) === JSON.stringify(cleanup.after)
  const expectedJobs = 18 + 4 * batches
  const lifecycleComplete = completeWorkerLifecycle(workers, workerEvents as WorkerEvent[], expectedJobs)
  const seaweedContainers = containerSummary.filter((container) => /seaweed/i.test(container.name)
    || /seaweed/i.test(containerConfiguration.find((config) => config.name === container.name)?.image ?? ""))
  const processingOrder = [...jobs].sort((a, b) => ms(a.processingStartedAt) - ms(b.processingStartedAt))
  const fifoOrder = [...jobs].sort((a, b) => ms(a.queuedAt) - ms(b.queuedAt) || a.id.localeCompare(b.id))
  const checks = {
    allJobsSucceeded: jobs.length === expectedJobs && jobs.every((job) => job.status === "SUCCEEDED"),
    workerMetricsComplete: workers.length === expectedJobs && workers.every((w) => w.final),
    workerLifecycleComplete: lifecycleComplete,
    twoWorkersObserved: Math.max(0, ...diskSamples.map((s) => s.workerCount)) === 2,
    fullQueueAndRejection: uploads.some((upload) => upload.status === 503), cleanupPassed,
    fifo: processingOrder.every((job, i) => job.id === fifoOrder[i]?.id),
    sharpTimeout: sharpDurations.length === expectedJobs && sharpDurations.every((duration) => Number.isFinite(duration) && duration < 30_000),
    queueTimeout: jobs.every((job) => ms(job.processingStartedAt) - ms(job.queuedAt) < 180_000),
    backendResponsive: healthSamples.length > 0 && healthSamples.every((sample) => sample.status === 200),
    workerMemoryBudget: lifecycleComplete && peakWorkerRssBytes <= 1024 * MiB && overlapUpperBoundBytes <= 1024 * MiB,
    temporaryBudget: peakTemporaryBytes <= 1024 * MiB,
    initialFreeDiskMargin: fs.bavail * fs.bsize >= 2 * 1024 * MiB,
    dockerMetricsAvailable: !containers.length || dockerSamples.every((sample) => sample.available),
    dockerConfigurationAvailable: containerConfiguration.every((config) => !config.errorCode),
    seaweedMemoryBudget: seaweedContainers.length > 0 && seaweedContainers.every((c) => c.samples > 0 && c.peakMemoryBytes <= 256 * MiB),
    actorExitClean: actorExited && actorClosed && actorExitCode === 0,
  }
  if (!cleanupPassed) fatal ||= "CLEANUP_NOT_PROVEN"
  const report = {
    schemaVersion: 1, runId, startedAt, finishedAt: new Date().toISOString(), fatal: fatal || null,
    passed: !fatal && Object.values(checks).every(Boolean), checks,
    environment: { ...environment, initialTemporaryFsFreeBytes: fs.bavail * fs.bsize, sharpVersions, containerConfiguration, compiledMediaSha256: sourceHash.digest("hex"),
      packageLockSha256: createHash("sha256").update(await readFile(join(__dirname, "../../../package-lock.json"))).digest("hex") },
    methodology: { sampleIntervalMs: 100, healthIntervalMs: 250, dockerTimeoutMs: 3000, batches, jobsPerBatch: 4,
      gate: "Solo queue_hold bloquea antes de fork; queue_work mide procesamiento real. No se modifican límites productivos.",
      limitations: ["Corpus sintético con padding: frontera de bytes/píxeles, no peor entropía posible.", "RSS combinado muestreado; high-water por proceso con solapamiento es cota superior, no pico simultáneo exacto.", "Docker stats es memoria de contenedor, no RSS, con menor frecuencia; disco temporal lógico no es disco físico S3.", "Sin frontend ni carga funcional mixta; salud verifica HTTP/DB, no experiencia completa.", "Tandas cortas sin GC forzado: retención del allocator no demuestra fuga ni su ausencia."] },
    corpus: corpus.map(({ path: _path, ...entry }) => entry),
    stages: stages.map((stage) => {
      const samples = actorSamples.filter((sample) => sample.phase === stage.name)
      const stageWorkers = workers.filter((worker) => workerEvents.some((event) => event.attempt === worker.attempt && event.event === "started" && event.phase === stage.name))
      const workerCpuMs = stageWorkers.reduce((sum, worker) => sum + (worker.cpu.user + worker.cpu.system) / 1000, 0)
      return { ...stage, workerCpuMs, averageWorkerCores: stage.durationMs ? workerCpuMs / stage.durationMs : null,
        peakBackendRssBytes: Math.max(0, ...samples.map((sample) => sample.memory.rss)),
        peakWorkerRssBytes: Math.max(0, ...diskSamples.filter((sample) => sample.phase === stage.name).map((sample) => sample.workerRssBytes)) }
    }), idle,
    summary: { jobs: jobs.length, workers: workers.length, peakWorkerRssBytes, overlapUpperBoundBytes, peakBackendRssBytes, peakTemporaryBytes,
      sharpMs: { p50: percentile(sharpDurations, .5), p95: percentile(sharpDurations, .95), max: percentile(sharpDurations, 1) },
      queueWaitMs: { max: percentile(jobs.map((j) => ms(j.processingStartedAt) - ms(j.queuedAt)), 1) },
      healthMs: { samples: healthSamples.length, p50: percentile(healthSamples.map((s) => s.milliseconds), .5), p95: percentile(healthSamples.map((s) => s.milliseconds), .95), max: percentile(healthSamples.map((s) => s.milliseconds), 1) },
      workerCpuMs: workers.reduce((sum, worker) => sum + (worker.cpu.user + worker.cpu.system) / 1000, 0),
      backendCpuMs: actorSamples.length > 1 ? ((actorSamples[actorSamples.length - 1].cpu.user + actorSamples[actorSamples.length - 1].cpu.system) - (actorSamples[0].cpu.user + actorSamples[0].cpu.system)) / 1000 : null,
      baselineBackendRssBytes: percentile(actorSamples.filter((s) => s.phase === "baseline").map((s) => s.memory.rss), .5),
      containers: containerSummary }, cleanup, actorShutdown: { actorExited, actorClosed, actorExitCode, activeResourceCounts },
  }
  const budgetKeys = new Set(["workerMemoryBudget", "temporaryBudget", "initialFreeDiskMargin", "seaweedMemoryBudget"])
  const functionalPassed = !fatal && Object.entries(checks).filter(([key]) => !budgetKeys.has(key)).every(([, pass]) => pass)
  Object.assign(report, { functionalPassed, budgetPassed: Object.entries(checks).filter(([key]) => budgetKeys.has(key)).every(([, pass]) => pass) })
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2))
  await writeFile(join(output, "samples.json"), JSON.stringify({ actorSamples, diskSamples, dockerSamples, healthSamples, workerEvents, workers, snapshots, uploads }, null, 2))
  const mib = (bytes: number) => (bytes / MiB).toFixed(1)
  await writeFile(join(output, "report.md"), `# Prueba local de imágenes\n\nFecha: ${startedAt}. Resultado: **${report.passed ? "PASS" : "REVISAR"}**${fatal ? ` (${fatal})` : ""}.\n\n| Medida | Resultado |\n| --- | --- |\n| Trabajos correctos | ${jobs.filter((j) => j.status === "SUCCEEDED").length}/${expectedJobs} |\n| RSS Sharp conjunto muestreado | ${mib(peakWorkerRssBytes)} MiB |\n| Cota superior con máximos solapados | ${mib(overlapUpperBoundBytes)} MiB |\n| RSS backend máximo | ${mib(peakBackendRssBytes)} MiB |\n| Temporal lógico máximo | ${mib(peakTemporaryBytes)} MiB |\n| Sharp p95 / máximo | ${report.summary.sharpMs.p95?.toFixed(0)} / ${report.summary.sharpMs.max?.toFixed(0)} ms |\n| Cola máxima | ${report.summary.queueWaitMs.max?.toFixed(0)} ms |\n| Salud p95 / máximo | ${report.summary.healthMs.p95?.toFixed(0)} / ${report.summary.healthMs.max?.toFixed(0)} ms |\n| Limpieza | ${cleanupPassed ? "PASS" : "REVISAR"} |\n\n## Comprobaciones\n\n${Object.entries(checks).map(([key, pass]) => `- ${key}: ${pass ? "PASS" : "REVISAR"}`).join("\n")}\n\n## Límites de la evidencia\n\n${report.methodology.limitations.map((line) => `- ${line}`).join("\n")}\n\nEntorno, hashes, tiempos, CPU, contenedores y tandas: report.json. Trazas sin credenciales: samples.json.\n`)
  // Borrado solo de la raíz mkdtemp creada aquí, después de confirmar muerte/cierre
  // y limpieza. Un fallo conserva los archivos como evidencia para recuperación.
  if (cleanupPassed && actorClosed && dirname(root) === parentTemp && basename(root).startsWith("weblogros-media-benchmark-") && await realpath(root) === root)
    await rm(root, { recursive: true, force: false })
  else console.log(`Temporal conservado para revisión: ${root}`)
  console.log(`Resultado: ${report.passed ? "PASS" : "REVISAR"}. Informe: ${join(output, "report.md")}`)
  process.exitCode = report.passed ? 0 : functionalPassed ? 2 : 1
}

void main().catch(() => { console.error("MEDIA_BENCHMARK_SETUP_FAILED (revisa argumentos, build y entorno privado)"); process.exitCode = 1 })
