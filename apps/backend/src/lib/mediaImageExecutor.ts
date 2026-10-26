import { fork } from "node:child_process"
import { lstat, mkdtemp, realpath, rm } from "node:fs/promises"
import { dirname, extname, join, resolve } from "node:path"
import {
  IMAGE_EDGES, IMAGE_PROCESSING_TIMEOUT_MS, imageKindSchema, imageWorkerMessageSchema,
  MediaImageError, type ImageErrorCode, type ImageKind, type ImageManifest,
} from "./mediaImageProtocol"

export interface ImageExecutionOptions {
  signal?: AbortSignal
  processingTimeoutMs?: number
  onPhase?: (event: { phase: "started" | "transforming"; pid: number; edge?: number }) => void
  onSpawn?: (event: { pid: number; outputDirectory: string }) => Promise<void>
}
export type ImageExecutionResult = ImageManifest & { outputDirectory: string }

// 📚 Nunca borramos el directorio del job ni su entrada. Antes de un borrado
// 📚 recursivo comprobamos la ruta absoluta del intento creado por este ejecutor.
async function cleanAttempt(directory: string, jobDirectory: string): Promise<void> {
  if (dirname(directory) !== jobDirectory || !(await lstat(directory)).isDirectory()
    || await realpath(directory) !== directory || !directory.startsWith(join(jobDirectory, "variants-"))) {
    throw new Error("UNSAFE_CLEANUP_TARGET")
  }
  await rm(directory, { recursive: true, force: false })
}

// 📚 Un mensaje de éxito no basta: confirmamos los archivos del manifiesto
// 📚 después de cerrar el proceso, sin aceptar rutas ni nombres arbitrarios.
async function validateOutput(manifest: ImageManifest, directory: string, kind: ImageKind): Promise<void> {
  if (manifest.kind !== kind || manifest.variants.length > IMAGE_EDGES[kind].length) throw new MediaImageError("WORKER_FAILED")
  const dimensions = new Set<string>()
  for (const variant of manifest.variants) {
    const expected = `image-${variant.width}x${variant.height}.${variant.format === "jpeg" ? "jpg" : "png"}`
    const dimension = `${variant.width}x${variant.height}`
    const file = await lstat(join(directory, variant.filename))
    if (variant.filename !== expected || variant.format !== manifest.inputFormat
      || Math.max(variant.width, variant.height) > IMAGE_EDGES[kind][0]
      || (kind === "avatar" && variant.width !== variant.height)
      || dimensions.has(dimension) || !file.isFile() || file.isSymbolicLink() || file.size !== variant.bytes) {
      throw new MediaImageError("WORKER_FAILED")
    }
    dimensions.add(dimension)
  }
}

// 📚 Contrato interno: directory viene del receptor temporal del backend,
// 📚 nunca del body del usuario. Este bloque no admite trabajos ni publica S3.
export async function executeMediaImage(
  request: { directory: string; kind: ImageKind }, options: ImageExecutionOptions = {},
): Promise<ImageExecutionResult> {
  const timeout = options.processingTimeoutMs ?? IMAGE_PROCESSING_TIMEOUT_MS
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > IMAGE_PROCESSING_TIMEOUT_MS) throw new RangeError("processingTimeoutMs debe estar entre 1 y 30000")
  if (options.signal?.aborted) throw new MediaImageError("CANCELED")
  if (!imageKindSchema.safeParse(request.kind).success) throw new MediaImageError("INVALID_WORKSPACE")
  let jobDirectory: string
  try {
    const directory = await lstat(request.directory)
    if (!directory.isDirectory() || directory.isSymbolicLink()) throw new Error("INVALID_DIRECTORY")
    jobDirectory = await realpath(request.directory)
    const input = await lstat(join(jobDirectory, "input.tmp"))
    if (!input.isFile() || input.isSymbolicLink()) throw new Error("INVALID_INPUT")
  } catch { throw new MediaImageError("INVALID_WORKSPACE") }
  const outputDirectory = await mkdtemp(join(jobDirectory, "variants-"))
  try {
    if (options.signal?.aborted) throw new MediaImageError("CANCELED")
    const manifest = await new Promise<ImageManifest>((resolveResult, rejectResult) => {
      const compiled = extname(__filename) === ".js"
      const backendDirectory = resolve(__dirname, "../..")
      // 📚 No heredamos execArgv (-e, --env-file...) ni secretos del backend.
      // 📚 Desarrollo carga TS; el build ejecuta directamente el trabajador JS.
      const env: NodeJS.ProcessEnv = {}
      for (const key of ["PATH", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "NODE_ENV"]) {
        if (process.env[key] !== undefined) env[key] = process.env[key]
      }
      if (!compiled) env.TS_NODE_PROJECT = join(backendDirectory, "tsconfig.json")
      const child = fork(join(__dirname, `mediaImageWorker.${compiled ? "js" : "ts"}`), [], {
        cwd: backendDirectory, env,
        execArgv: compiled ? [] : ["-r", require.resolve("ts-node/register")],
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      })
      let failure: ImageErrorCode | undefined
      let result: ImageManifest | undefined
      let started = false
      let ready = false
      let timer: NodeJS.Timeout
      let registration: Promise<void>
      const stop = (code: ImageErrorCode) => {
        failure ??= code
        // 📚 kill() pide terminar. Su valor de retorno y child.killed NO confirman
        // 📚 que terminó: el único punto que resuelve/rechaza es el evento close.
        if (child.exitCode === null && child.signalCode === null) {
          // 📚 Si el sistema rechaza la señal, seguimos esperando close; nunca
          // 📚 fingimos que se liberaron los recursos por un fallo de kill().
          try { child.kill("SIGKILL") } catch { /* El cierre sigue siendo obligatorio. */ }
        }
      }
      const abort = () => stop("CANCELED")
      timer = setTimeout(() => stop("WORKER_START_TIMEOUT"), 10_000)
      options.signal?.addEventListener("abort", abort, { once: true })
      child.on("error", () => stop("WORKER_FAILED"))
      child.on("message", (raw) => {
        if (failure) return
        const parsed = imageWorkerMessageSchema.safeParse(raw)
        if (!parsed.success) { stop("WORKER_FAILED"); return }
        const message = parsed.data
        try {
          if (message.type === "ready") {
            if (ready) { stop("WORKER_FAILED"); return }
            ready = true
            // 📚 El hijo espera sin transformar hasta confirmar PID/directorio en DB.
            // 📚 Si el padre cae antes de esa confirmación, nunca autorizó Sharp.
            void registration.then(() => {
              if (failure || options.signal?.aborted || !child.connected) {
                stop(options.signal?.aborted ? "CANCELED" : "WORKER_FAILED")
                return
              }
              child.send({ kind: request.kind, inputPath: join(jobDirectory, "input.tmp"), outputDirectory },
                (error) => { if (error) stop("WORKER_FAILED") })
            }).catch(() => stop("WORKER_FAILED"))
          } else if (message.type === "started") {
            if (!ready || started) { stop("WORKER_FAILED"); return }
            started = true
            clearTimeout(timer)
            // 📚 Los 30 segundos son de procesamiento: no incluyen cargar Node/TS.
            timer = setTimeout(() => stop("PROCESSING_TIMEOUT"), timeout)
            options.onPhase?.({ phase: "started", pid: child.pid! })
          } else if (message.type === "transforming") {
            if (!started || result) { stop("WORKER_FAILED"); return }
            options.onPhase?.({ phase: "transforming", pid: child.pid!, edge: message.edge })
          } else if (message.type === "processed") {
            if (!started || result) { stop("WORKER_FAILED"); return }
            result = message.manifest
          } else stop(message.code)
        } catch { stop("WORKER_FAILED") }
      })
      child.once("close", async (code) => {
        clearTimeout(timer)
        options.signal?.removeEventListener("abort", abort)
        // 📚 Cerrar al hijo no cancela una escritura DB iniciada al registrar su
        // 📚 PID; esperamos también ese intento antes de devolver el control al caller.
        await registration.catch(() => {})
        if (failure) rejectResult(new MediaImageError(failure))
        else if (code !== 0 || !result) rejectResult(new MediaImageError("WORKER_FAILED"))
        else resolveResult(result)
      })
      registration = Promise.resolve().then(async () => {
        if (!child.pid) throw new Error("WORKER_PID_MISSING")
        await options.onSpawn?.({ pid: child.pid, outputDirectory })
      })
      // 📚 Observamos también el rechazo si el hijo nunca llegó a ready; su cierre
      // 📚 sigue siendo obligatorio antes de rechazar y liberar cualquier puesto.
      void registration.catch(() => stop("WORKER_FAILED"))
      if (options.signal?.aborted) abort()
    })
    await validateOutput(manifest, outputDirectory, request.kind)
    if (options.signal?.aborted) throw new MediaImageError("CANCELED")
    return { ...manifest, outputDirectory }
  } catch (error) {
    const failure = error instanceof MediaImageError ? error : new MediaImageError("WORKER_FAILED")
    try { await cleanAttempt(outputDirectory, jobDirectory) }
    catch { failure.cleanupPendingDirectory = outputDirectory }
    throw failure
  }
}
