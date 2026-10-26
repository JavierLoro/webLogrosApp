import { createWriteStream } from "node:fs"
import { lstat, mkdir, readFile, readdir, realpath, rmdir, unlink, writeFile } from "node:fs/promises"
import { IncomingHttpHeaders } from "node:http"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { Readable, Transform, TransformCallback, Writable } from "node:stream"
import { pipeline } from "node:stream/promises"
import busboy from "busboy"
import { IMAGE_MAX_BYTES } from "./mediaImageProtocol"
import {
  MediaUploadError,
  mediaUploadOptionsSchema,
  multipartContentTypeSchema,
} from "./mediaUploadProtocol"

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])

export type MediaUploadResult = {
  directory: string
  inputPath: string
  bytes: number
  inputFormat: "png" | "jpeg"
}

type MediaUploadOptions = {
  temporaryRoot: string
  jobId: string
  signal?: AbortSignal
  ownership?: { runtimeOwnerId: string; receiptToken: string }
}

// 📚 Solo reconocemos firmas de contenedor en los primeros bytes; decodificar y
// 📚 comprobar dimensiones, corrupción o animación pertenece a Sharp en el paso siguiente.
function detectInputFormat(prefix: Buffer, prefixBytes: number): "png" | "jpeg" | undefined {
  if (prefixBytes >= PNG_SIGNATURE.length && prefix.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return "png"
  if (prefixBytes >= JPEG_SIGNATURE.length && prefix.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return "jpeg"
  return undefined
}

// 📚 El prefijo es un buffer fijo de ocho bytes: el contador no acumula la imagen en memoria.
function createImageGuard(onBytes: (bytes: number) => void, onFormat: (format: "png" | "jpeg") => void): Transform {
  const prefix = Buffer.alloc(PNG_SIGNATURE.length)
  let prefixBytes = 0
  let totalBytes = 0
  let format: "png" | "jpeg" | undefined

  return new Transform({
    transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
      totalBytes += chunk.length
      onBytes(totalBytes)
      if (totalBytes > IMAGE_MAX_BYTES) {
        callback(new MediaUploadError("FILE_TOO_LARGE"))
        return
      }

      if (prefixBytes < prefix.length) {
        const copyBytes = Math.min(prefix.length - prefixBytes, chunk.length)
        chunk.copy(prefix, prefixBytes, 0, copyBytes)
        prefixBytes += copyBytes
      }

      format ??= detectInputFormat(prefix, prefixBytes)
      if (prefixBytes === prefix.length && !format) {
        callback(new MediaUploadError("UNSUPPORTED_FORMAT"))
        return
      }
      if (format) onFormat(format)
      callback(null, chunk)
    },
    flush(callback: TransformCallback) {
      format ??= detectInputFormat(prefix, prefixBytes)
      if (!format) {
        callback(new MediaUploadError("UNSUPPORTED_FORMAT"))
        return
      }
      onFormat(format)
      callback()
    },
  })
}

// 📚 `destroyed` solo dice que empezó el teardown; esperamos `close` para que Windows
// 📚 y el filesystem confirmen que ya no hay handles abiertos.
function waitForClose(stream: Readable | Writable): Promise<void> {
  if (stream.closed) return Promise.resolve()
  return new Promise((resolveClose) => stream.once("close", resolveClose))
}

// 📚 Antes de limpiar, comprobamos otra vez que root/jobId sigue siendo el directorio
// 📚 canónico que esta invocación creó; un symlink nunca se sigue para borrar.
async function isOwnedJobDirectory(root: string, directory: string, jobId: string): Promise<boolean> {
  try {
    const rootInfo = await lstat(root)
    const directoryInfo = await lstat(directory)
    const canonicalRoot = await realpath(root)
    const canonicalDirectory = await realpath(directory)
    return rootInfo.isDirectory()
      && !rootInfo.isSymbolicLink()
      && directoryInfo.isDirectory()
      && !directoryInfo.isSymbolicLink()
      && canonicalRoot === root
      && canonicalDirectory === directory
      && dirname(directory) === root
      && basename(directory) === jobId
      && relative(root, directory) === jobId
      && !relative(root, directory).startsWith(`..${sep}`)
  } catch {
    return false
  }
}

// 📚 La limpieza no es recursiva: retira solo el input creado y rmdir deja cualquier
// 📚 archivo ajeno intacto, informando la carpeta pendiente para reconciliación posterior.
async function cleanOwnedWorkspace(
  root: string,
  directory: string,
  inputPath: string,
  jobId: string,
  inputCreated: boolean,
  markerContent?: string,
): Promise<boolean> {
  if (!(await isOwnedJobDirectory(root, directory, jobId))) return false

  let cleanupFailed = false
  if (inputCreated) {
    try {
      const inputInfo = await lstat(inputPath)
      if (!inputInfo.isFile() || inputInfo.isSymbolicLink() || dirname(inputPath) !== directory) {
        cleanupFailed = true
      } else {
        await unlink(inputPath)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") cleanupFailed = true
    }
  }

  if (markerContent !== undefined) {
    const marker = join(directory, ".receipt-owner.json")
    try {
      const info = await lstat(marker)
      const remaining = await readdir(directory)
      if (!info.isFile() || info.isSymbolicLink() || info.size > 1024
        || await readFile(marker, "utf8") !== markerContent
        || remaining.some((name) => name !== ".receipt-owner.json")) return false
      await unlink(marker)
    } catch { return false }
  }

  try {
    // 📚 rmdir elimina solo el directorio si quedó vacío; archivos ajenos se conservan.
    await rmdir(directory)
  } catch {
    cleanupFailed = true
  }
  return !cleanupFailed
}

// 📚 Recibe una sola pieza multipart a disco con contrapresión y frontera de bytes;
// 📚 no toca Prisma, cola, permisos, S3 ni decide si el archivo es decodificable.
// 📚 Solo admite fuentes Node que emiten `close` al destruirse; las que lo suprimen
// 📚 no son compatibles porque no se puede confirmar el cierre antes de resolver.
export async function receiveMediaUpload(
  source: Readable,
  headers: IncomingHttpHeaders,
  options: MediaUploadOptions,
): Promise<MediaUploadResult> {
  const validOptions = mediaUploadOptionsSchema.safeParse(options)
  const contentType = headers && typeof headers === "object" && !Array.isArray(headers)
    ? headers["content-type"]
    : undefined
  if (!validOptions.success || !(source instanceof Readable)
    || source.destroyed || source.readableEnded
    || typeof contentType !== "string" || !multipartContentTypeSchema.safeParse(contentType).success) {
    throw new MediaUploadError("INVALID_UPLOAD_INPUT")
  }
  const { temporaryRoot, signal } = validOptions.data
  const jobId = validOptions.data.jobId.toLowerCase()
  if (signal?.aborted) throw new MediaUploadError("UPLOAD_ABORTED")

  let parser: ReturnType<typeof busboy>
  try {
    parser = busboy({
      headers,
      limits: { fileSize: IMAGE_MAX_BYTES + 1, files: 1, fields: 0 },
    })
  } catch {
    throw new MediaUploadError("INVALID_MULTIPART")
  }

  let root: string
  try {
    const requestedRoot = resolve(temporaryRoot)
    const rootInfo = await lstat(requestedRoot)
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("INVALID_ROOT")
    root = await realpath(requestedRoot)
  } catch {
    throw new MediaUploadError("INVALID_WORKSPACE")
  }

  if (signal?.aborted) throw new MediaUploadError("UPLOAD_ABORTED")
  const directory = join(root, jobId)
  const inputPath = join(directory, "input.tmp")
  const abortController = new AbortController()
  const filePipelines: Promise<void>[] = []
  const closeWaiters: Promise<void>[] = []
  let sourcePipeline: Promise<void> | undefined
  let uploadFailure: MediaUploadError | undefined
  let directoryCreated = false
  let inputCreated = false
  let markerContent: string | undefined
  let fileCount = 0
  let receivedBytes = 0
  let inputFormat: "png" | "jpeg" | undefined

  // 📚 La primera causa gana; setImmediate deja terminar el ciclo de evento de Busboy antes de destruir sus streams.
  const fail = (error: MediaUploadError): void => {
    uploadFailure ??= error
    setImmediate(() => abortController.abort())
  }
  const onExternalAbort = (): void => fail(new MediaUploadError("UPLOAD_ABORTED"))
  const onSourceError = (): void => fail(new MediaUploadError("UPLOAD_INTERRUPTED"))
  const onSourceClose = (): void => {
    if (!source.readableEnded && !abortController.signal.aborted) fail(new MediaUploadError("UPLOAD_INTERRUPTED"))
  }
  const onParserError = (): void => fail(new MediaUploadError("INVALID_MULTIPART"))

  signal?.addEventListener("abort", onExternalAbort, { once: true })
  source.on("error", onSourceError)
  source.on("close", onSourceClose)
  parser.on("error", onParserError)

  try {
    try {
      await mkdir(directory, { mode: 0o700 })
      directoryCreated = true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new MediaUploadError("WORKSPACE_EXISTS")
      throw new MediaUploadError("TEMPORARY_STORAGE_FAILED")
    }

    if (!(await isOwnedJobDirectory(root, directory, jobId))) throw new MediaUploadError("INVALID_WORKSPACE")
    if (validOptions.data.ownership) {
      // 📚 Solo el mkdir ganador deja esta prueba de propiedad. Un EEXIST jamás
      // 📚 recibe nuestro marcador ni autoriza borrar el contenido de esa carpeta.
      const content = JSON.stringify({ jobId, ...validOptions.data.ownership })
      await writeFile(join(directory, ".receipt-owner.json"), content, { flag: "wx", mode: 0o600, flush: true })
      markerContent = content
    }
    if (uploadFailure) throw uploadFailure
    if (signal?.aborted) throw new MediaUploadError("UPLOAD_ABORTED")

    parser.on("file", (fieldName, file) => {
      fileCount += 1
      closeWaiters.push(waitForClose(file))
      file.on("limit", () => fail(new MediaUploadError("FILE_TOO_LARGE")))
      if (fileCount > 1) {
        fail(new MediaUploadError("TOO_MANY_FILES"))
        file.resume()
        return
      }
      if (fieldName !== "image") {
        fail(new MediaUploadError("UNEXPECTED_FILE_FIELD"))
        file.resume()
        return
      }

      const writer = createWriteStream(inputPath, { flags: "wx", mode: 0o600 })
      writer.once("open", () => { inputCreated = true })
      closeWaiters.push(waitForClose(writer))

      const guard = createImageGuard(
        (bytes) => { receivedBytes = bytes },
        (format) => { inputFormat = format },
      )
      const filePipeline = pipeline(file, guard, writer, { signal: abortController.signal })
      filePipelines.push(filePipeline)
      void filePipeline.catch((error: unknown) => {
        if (error instanceof MediaUploadError) fail(error)
        else if (!uploadFailure) fail(new MediaUploadError("TEMPORARY_STORAGE_FAILED"))
      })
    })
    parser.on("filesLimit", () => fail(new MediaUploadError("TOO_MANY_FILES")))
    parser.on("fieldsLimit", () => fail(new MediaUploadError("UNEXPECTED_TEXT_FIELD")))

    closeWaiters.push(waitForClose(source), waitForClose(parser))
    sourcePipeline = pipeline(source, parser, { signal: abortController.signal })
    await sourcePipeline
    await Promise.all(filePipelines)
    await Promise.all(closeWaiters)

    if (uploadFailure) throw uploadFailure
    if (fileCount !== 1) throw new MediaUploadError("FILE_REQUIRED")
    if (!inputFormat || receivedBytes <= 0) throw new MediaUploadError("UNSUPPORTED_FORMAT")

    const inputInfo = await lstat(inputPath)
    if (!inputInfo.isFile() || inputInfo.isSymbolicLink()) throw new MediaUploadError("TEMPORARY_STORAGE_FAILED")
    if (uploadFailure) throw uploadFailure
    if (signal?.aborted) throw new MediaUploadError("UPLOAD_ABORTED")
    return { directory, inputPath, bytes: receivedBytes, inputFormat }
  } catch (error) {
    if (!uploadFailure) {
      if (error instanceof MediaUploadError) uploadFailure = error
      else if (signal?.aborted) uploadFailure = new MediaUploadError("UPLOAD_ABORTED")
      else if (sourcePipeline) uploadFailure = new MediaUploadError("INVALID_MULTIPART")
      else uploadFailure = new MediaUploadError("TEMPORARY_STORAGE_FAILED")
    }

    abortController.abort()
    await Promise.allSettled([...(sourcePipeline ? [sourcePipeline] : []), ...filePipelines])
    await Promise.allSettled(closeWaiters)

    if (directoryCreated) {
      const cleaned = await cleanOwnedWorkspace(root, directory, inputPath, jobId, inputCreated, markerContent)
      if (!cleaned) uploadFailure.cleanupPendingDirectory = directory
    }
    throw uploadFailure
  } finally {
    signal?.removeEventListener("abort", onExternalAbort)
    source.removeListener("error", onSourceError)
    source.removeListener("close", onSourceClose)
    parser.removeListener("error", onParserError)
  }
}
