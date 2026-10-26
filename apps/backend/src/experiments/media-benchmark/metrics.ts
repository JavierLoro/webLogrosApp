import { execFile } from "node:child_process"
import { lstat, realpath, readdir, readFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

export interface WorkerMetric {
  pid: number
  attempt: string
  jobId: string
  startedAt: string
  at: string
  finishedAt?: string
  phase?: string
  memory: { rss: number; heapUsed: number; external: number; arrayBuffers: number }
  peakRssBytes: number
  /** CPU time in cumulative microseconds, as reported by process.cpuUsage(). */
  cpu: { user: number; system: number }
  resourceUsageMaxRssBytes: number
  final?: boolean
}

export interface DockerMetric {
  name: string
  cpuPercent: number | null
  memoryBytes: number | null
  raw: string
  errorCode?: "DOCKER_UNAVAILABLE" | "DOCKER_TIMEOUT" | "DOCKER_OUTPUT_INVALID"
}

export interface DockerMetricsResult {
  available: boolean
  samples: DockerMetric[]
  errorCode?: "DOCKER_UNAVAILABLE" | "DOCKER_TIMEOUT" | "DOCKER_OUTPUT_INVALID"
}

export interface DockerConfiguration {
  name: string
  image: string | null
  memoryLimitBytes: number | null
  cpuQuotaCores: number | null
  errorCode?: string
}

export interface DirectoryBytes { bytes: number; files: number; directories: number }

// 📚 Solo se aceptan snapshots ya escritos por el preload: los archivos parciales
// 📚 o ajenos al esquema se ignoran y la ordenación estable simplifica la comparación.
export async function readWorkerMetrics(metricsRoot: string): Promise<WorkerMetric[]> {
  const root = await canonicalDirectory(metricsRoot)
  if (!root) return []
  const entries = await readdir(root, { withFileTypes: true })
  const results: WorkerMetric[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !/^worker-\d+-[0-9a-f-]+\.json$/i.test(entry.name)) continue
    try {
      const parsed: unknown = JSON.parse(await readFile(path.join(root, entry.name), "utf8"))
      if (isWorkerMetric(parsed)) results.push(parsed)
    } catch { /* A concurrent write or malformed record is omitted. */ }
  }
  return results.sort((a, b) => a.pid - b.pid || a.at.localeCompare(b.at))
}

// 📚 lstat evita seguir enlaces: un enlace podría escapar del árbol medido y
// 📚 falsear el tamaño. Archivos especiales y errores inesperados fallan cerrados.
export async function measureDirectoryBytes(rootPath: string): Promise<DirectoryBytes> {
  const root = await canonicalDirectory(rootPath)
  if (!root) return { bytes: 0, files: 0, directories: 0 }
  const total: DirectoryBytes = { bytes: 0, files: 0, directories: 0 }
  const visit = async (directory: string): Promise<void> => {
    let names: string[]
    try { names = await readdir(directory) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return
      throw error
    }
    for (const name of names) {
      const fullPath = path.join(directory, name)
      let stat
      try { stat = await lstat(fullPath) }
      catch (error) {
        // 📚 El cleanup puede quitar una entrada entre readdir y lstat; ENOENT
        // 📚 solo significa que ya no forma parte del snapshot que medimos.
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue
        throw error
      }
      if (stat.isSymbolicLink()) throw new Error("SYMLINK_IN_MEASURED_DIRECTORY")
      if (stat.isDirectory()) { total.directories++; await visit(fullPath) }
      else if (stat.isFile()) { total.files++; total.bytes += stat.size }
      else throw new Error("UNSUPPORTED_ENTRY_IN_MEASURED_DIRECTORY")
    }
  }
  await visit(root)
  return total
}

// 📚 Cada proceso consulta exclusivamente el nombre recibido, sin shell ni una
// 📚 búsqueda global de contenedores; timeout mantiene acotado el ensayo.
export async function sampleDockerMetrics(containers: string[]): Promise<DockerMetricsResult> {
  if (!containers.length) return { available: true, samples: [] }
  const samples: DockerMetric[] = []
  for (const name of containers) {
    try {
      const { stdout } = await execFileAsync("docker", ["stats", "--no-stream", "--format", "{{json .}}", name], {
        timeout: 3000, windowsHide: true, maxBuffer: 64 * 1024,
      })
      const raw = stdout.trim()
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") throw new Error("invalid output")
      const value = parsed as Record<string, unknown>
      const cpu = parsePercent(value.CPUPerc)
      const memory = parseDockerMemory(value.MemUsage)
      if (cpu === null || memory === null) throw new Error("invalid metrics")
      samples.push({ name, cpuPercent: cpu, memoryBytes: memory, raw })
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      const errorCode = code === "ETIMEDOUT" ? "DOCKER_TIMEOUT"
        : code === "ENOENT" ? "DOCKER_UNAVAILABLE" : "DOCKER_OUTPUT_INVALID"
      samples.push({ name, cpuPercent: null, memoryBytes: null, raw: "", errorCode })
      if (errorCode === "DOCKER_UNAVAILABLE" || errorCode === "DOCKER_TIMEOUT") {
        return { available: false, samples, errorCode }
      }
      if (errorCode === "DOCKER_OUTPUT_INVALID") return { available: false, samples, errorCode }
    }
  }
  return { available: true, samples }
}

// 📚 inspect revela límites de ejecución para repetir un benchmark; se solicitan
// 📚 exclusivamente HostConfig e imagen, nunca Config.Env ni otros datos sensibles.
export async function dockerConfiguration(containers: string[]): Promise<DockerConfiguration[]> {
  const results: DockerConfiguration[] = []
  for (const name of containers) {
    try {
      const [hostResult, imageResult] = await Promise.all([
        execFileAsync("docker", ["inspect", "--format", "{{json .HostConfig}}", name], {
          timeout: 3000, windowsHide: true, maxBuffer: 64 * 1024,
        }),
        execFileAsync("docker", ["inspect", "--format", "{{json .Config.Image}}", name], {
          timeout: 3000, windowsHide: true, maxBuffer: 64 * 1024,
        }),
      ])
      const host: unknown = JSON.parse(hostResult.stdout.trim())
      const image: unknown = JSON.parse(imageResult.stdout.trim())
      if (!host || typeof host !== "object" || typeof image !== "string") throw new Error("invalid inspect output")
      const config = host as Record<string, unknown>
      const memory = positiveNumber(config.Memory)
      const nanoCpus = positiveNumber(config.NanoCpus)
      const quota = positiveNumber(config.CpuQuota)
      const period = positiveNumber(config.CpuPeriod)
      const cpuQuotaCores = nanoCpus !== null ? nanoCpus / 1_000_000_000
        : quota !== null && period !== null ? quota / period : null
      results.push({ name, image, memoryLimitBytes: memory, cpuQuotaCores })
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      const errorCode = code === "ETIMEDOUT" ? "DOCKER_TIMEOUT"
        : code === "ENOENT" ? "DOCKER_UNAVAILABLE" : "DOCKER_INSPECT_FAILED"
      results.push({ name, image: null, memoryLimitBytes: null, cpuQuotaCores: null, errorCode })
    }
  }
  return results
}

export interface EnvironmentSnapshot {
  os: { platform: string; release: string; arch: string }
  node: string
  cpuCount: number
  totalMemoryBytes: number
  freeMemoryBytes: number
  cgroup: { memoryLimitBytes?: number; cpuQuotaCores?: number }
  versions: Record<string, string>
}

// 📚 El snapshot consulta límites Linux conocidos y conserva los recursos del host
// 📚 como referencia; ausencia/"max" representa un límite cgroup no declarado.
export async function environmentSnapshot(): Promise<EnvironmentSnapshot> {
  const cgroup: EnvironmentSnapshot["cgroup"] = {}
  if (process.platform === "linux") {
    const memory = await readOptional("/sys/fs/cgroup/memory.max")
    const quota = await readOptional("/sys/fs/cgroup/cpu.max")
    if (memory && memory.trim() !== "max" && /^\d+$/.test(memory.trim())) cgroup.memoryLimitBytes = Number(memory.trim())
    if (quota) {
      const [quotaUs, periodUs] = quota.trim().split(/\s+/).map(Number)
      if (Number.isFinite(quotaUs) && Number.isFinite(periodUs) && quotaUs > 0 && periodUs > 0) cgroup.cpuQuotaCores = quotaUs / periodUs
    }
    if (!cgroup.memoryLimitBytes) {
      const v1Memory = await readOptional("/sys/fs/cgroup/memory/memory.limit_in_bytes")
      if (v1Memory && /^\d+$/.test(v1Memory.trim())) {
        const value = Number(v1Memory.trim())
        if (value < Number.MAX_SAFE_INTEGER) cgroup.memoryLimitBytes = value
      }
    }
    if (!cgroup.cpuQuotaCores) {
      const v1Quota = await readOptional("/sys/fs/cgroup/cpu/cpu.cfs_quota_us")
      const v1Period = await readOptional("/sys/fs/cgroup/cpu/cpu.cfs_period_us")
      const q = Number(v1Quota), p = Number(v1Period)
      if (q > 0 && p > 0) cgroup.cpuQuotaCores = q / p
    }
  }
  return {
    os: { platform: process.platform, release: os.release(), arch: process.arch }, node: process.version,
    cpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem(), cgroup,
    versions: Object.fromEntries(Object.entries(process.versions).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
  }
}

async function canonicalDirectory(input: string): Promise<string | null> {
  let canonical: string
  try { canonical = await realpath(input) }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error }
  const normalizedInput = path.resolve(input)
  const same = process.platform === "win32"
    ? normalizedInput.toLowerCase() === canonical.toLowerCase()
    : normalizedInput === canonical
  if (!same) throw new Error("NON_CANONICAL_DIRECTORY_PATH")
  if (!(await lstat(canonical)).isDirectory()) throw new Error("NOT_A_DIRECTORY")
  return canonical
}

async function readOptional(file: string): Promise<string | undefined> {
  try { return await readFile(file, "utf8") }
  catch (error) { if (["ENOENT", "EACCES", "EPERM"].includes((error as NodeJS.ErrnoException).code ?? "")) return undefined; throw error }
}

function parsePercent(value: unknown): number | null {
  if (typeof value !== "string") return null
  const match = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(value)
  return match ? Number(match[1]) : null
}

function positiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null
}

function parseDockerMemory(value: unknown): number | null {
  if (typeof value !== "string") return null
  const usage = value.split("/")[0]?.trim()
  const match = /^(\d+(?:\.\d+)?)\s*(B|bytes?|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i.exec(usage ?? "")
  if (!match) return null
  const unit = match[2].toLowerCase()
  const powers: Record<string, number> = { b: 0, byte: 0, bytes: 0, kb: 1, mb: 2, gb: 3, tb: 4, kib: 1, mib: 2, gib: 3, tib: 4 }
  const base = unit.endsWith("ib") ? 1024 : 1000
  return Math.round(Number(match[1]) * base ** powers[unit])
}

function isWorkerMetric(value: unknown): value is WorkerMetric {
  if (!value || typeof value !== "object") return false
  const metric = value as Partial<WorkerMetric>
  const finite = (number: unknown) => typeof number === "number" && Number.isFinite(number) && number >= 0
  return Number.isInteger(metric.pid) && typeof metric.attempt === "string" && typeof metric.jobId === "string" && typeof metric.startedAt === "string"
    && typeof metric.at === "string" && !!metric.memory && finite(metric.memory.rss) && finite(metric.memory.heapUsed)
    && finite(metric.memory.external) && finite(metric.memory.arrayBuffers) && finite(metric.peakRssBytes)
    && !!metric.cpu && finite(metric.cpu.user) && finite(metric.cpu.system) && finite(metric.resourceUsageMaxRssBytes)
}
