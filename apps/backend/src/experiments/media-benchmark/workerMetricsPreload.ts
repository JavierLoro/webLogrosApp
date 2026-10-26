import { realpathSync, statSync, writeFileSync } from "node:fs"
import { isAbsolute, resolve } from "node:path"
import { memoryUsage } from "node:process"

// 📚 Este preload se activa solo para el worker del benchmark y escribe muestras
// 📚 locales; no inspecciona ni procesa mensajes IPC del actor.
const enabled = process.env.MEDIA_BENCHMARK_WORKER_METRICS === "1"
if (enabled) {
  const metricsRoot = process.env.MEDIA_BENCHMARK_METRICS_DIR
  const attempt = process.env.MEDIA_BENCHMARK_ATTEMPT
  const jobId = process.env.MEDIA_BENCHMARK_JOB_ID
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!metricsRoot || !isAbsolute(metricsRoot) || !attempt || !uuid.test(attempt) || !jobId || !uuid.test(jobId)) {
    throw new Error("INVALID_MEDIA_BENCHMARK_METRICS_CONFIG")
  }
  const canonicalRoot = realpathSync(metricsRoot)
  if (resolve(metricsRoot) !== canonicalRoot) throw new Error("NON_CANONICAL_MEDIA_BENCHMARK_METRICS_DIR")
  if (!statSync(canonicalRoot).isDirectory()) throw new Error("MEDIA_BENCHMARK_METRICS_DIR_NOT_DIRECTORY")
  if (process.platform !== "win32" && (statSync(canonicalRoot).mode & 0o077) !== 0) {
    throw new Error("MEDIA_BENCHMARK_METRICS_DIR_NOT_PRIVATE")
  }
  const output = resolve(canonicalRoot, `worker-${process.pid}-${attempt}.json`)
  const startedAt = new Date().toISOString()
  let peakRssBytes = 0

  const writeSample = (final = false): void => {
    const memory = memoryUsage()
    const cpuNow = process.cpuUsage()
    peakRssBytes = Math.max(peakRssBytes, memory.rss)
    const record = {
      pid: process.pid,
      attempt,
      jobId,
      startedAt,
      at: new Date().toISOString(),
      ...(final ? { finishedAt: new Date().toISOString() } : {}),
      memory: { rss: memory.rss, heapUsed: memory.heapUsed, external: memory.external, arrayBuffers: memory.arrayBuffers },
      peakRssBytes,
      // 📚 process.cpuUsage(previous) entrega microsegundos acumulados desde la
      // 📚 muestra anterior; el runner calcula porcentaje sobre el tiempo real.
      cpu: { user: cpuNow.user, system: cpuNow.system },
      resourceUsageMaxRssBytes: process.resourceUsage().maxRSS * 1024,
      ...(final ? { final: true } : {}),
    }
    writeFileSync(output, JSON.stringify(record), { mode: 0o600 })
  }
  const interval = setInterval(() => writeSample(), 100)
  interval.unref()
  process.on("exit", () => {
    clearInterval(interval)
    try { writeSample(true) } catch { /* 📚 No se puede recuperar un fallo de disco durante exit. */ }
  })
  writeSample()
}
