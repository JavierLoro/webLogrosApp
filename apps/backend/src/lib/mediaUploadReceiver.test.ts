import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, rmdir, stat, symlink, unlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { Readable } from "node:stream"
import { test, TestContext } from "node:test"
import sharp from "sharp"
import { IMAGE_MAX_BYTES } from "./mediaImageProtocol"
import { MediaUploadError, type MediaUploadErrorCode } from "./mediaUploadProtocol"
import { receiveMediaUpload, type MediaUploadResult } from "./mediaUploadReceiver"

const BOUNDARY = "lockerboard-media-receiver-test"
const HEADERS = { "content-type": `multipart/form-data; boundary=${BOUNDARY}` }
const JOB_ONE = "3b241101-e2bb-4255-8caf-4136c566a962"

// 📚 Cada test crea un root canónico propio y solo lo borra tras comprobar su prefijo.
async function withRoot(run: (root: string) => Promise<void>): Promise<void> {
  const tempRoot = await realpath(tmpdir())
  const root = await realpath(await mkdtemp(join(tempRoot, "lockerboard-upload-test-")))
  try {
    await run(root)
  } finally {
    assert.equal(dirname(root), tempRoot)
    assert.ok(resolve(root).startsWith(join(tempRoot, "lockerboard-upload-test-")))
    assert.equal(await realpath(root), root)
    await rm(root, { recursive: true, force: false })
  }
}

function filePart(payload: AsyncIterable<Buffer>, options: { field?: string; filename?: string; mime?: string } = {}): AsyncIterable<Buffer> {
  const field = options.field ?? "image"
  const filename = options.filename ?? "../../untrusted.jpg"
  const mime = options.mime ?? "image/jpeg"
  return (async function* () {
    yield Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="${field}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`)
    yield* payload
    yield Buffer.from("\r\n")
  })()
}

function multipart(parts: AsyncIterable<Buffer>, options: { closeForm?: boolean; extraField?: boolean; extraFile?: boolean } = {}): Readable {
  return Readable.from((async function* () {
    yield* parts
    if (options.extraFile) {
      yield Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="second.jpg"\r\nContent-Type: image/jpeg\r\n\r\nx\r\n`)
    }
    if (options.extraField) {
      yield Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="unexpected"\r\n\r\ntext\r\n`)
    }
    if (options.closeForm !== false) yield Buffer.from(`--${BOUNDARY}--\r\n`)
  })())
}

function byteStream(bytes: Buffer): AsyncIterable<Buffer> {
  return (async function* () { yield bytes })()
}

async function tinyJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 3, height: 2, channels: 3, background: "red" } }).jpeg().toBuffer()
}

async function tinyPng(): Promise<Buffer> {
  return sharp({ create: { width: 2, height: 2, channels: 4, background: { r: 20, g: 60, b: 100, alpha: 0.5 } } }).png().toBuffer()
}

function errorCode(code: MediaUploadErrorCode): (error: unknown) => boolean {
  return (error) => error instanceof MediaUploadError && error.code === code
}

async function removeSuccess(result: MediaUploadResult): Promise<void> {
  const directory = await realpath(result.directory)
  assert.equal(directory, result.directory)
  assert.equal(dirname(result.inputPath), directory)
  await unlink(result.inputPath)
  await rmdir(directory)
}

// 📚 El source demora físicamente _destroy para que la prueba detecte resoluciones
// 📚 prematuras basadas solo en `destroyed`, antes del evento `close`.
class SlowMultipartSource extends Readable {
  private readonly chunks: Buffer[]
  private timer?: NodeJS.Timeout
  private index = 0

  constructor(payload: Buffer) {
    super()
    this.chunks = [
      Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="ignored.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
      payload,
      Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
    ]
  }

  override _read(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = undefined
      const next = this.chunks[this.index++]
      if (next) this.push(next)
      else this.push(null)
    }, 10)
  }

  override _destroy(error: Error | null, callback: (error?: Error | null) => void): void {
    if (this.timer) clearTimeout(this.timer)
    setTimeout(() => callback(error), 20)
  }
}

test("guarda JPEG por firma binaria e ignora filename y MIME declarados", async () => {
  await withRoot(async (root) => {
    const jpeg = await tinyJpeg()
    const body = multipart(filePart(byteStream(jpeg), { filename: "../../outside.png", mime: "image/png" }))
    let sourceClosed = false
    body.once("close", () => { sourceClosed = true })
    const result = await receiveMediaUpload(body, HEADERS, { temporaryRoot: root, jobId: JOB_ONE })
    assert.equal(sourceClosed, true)
    assert.equal(result.inputFormat, "jpeg")
    assert.equal(result.bytes, jpeg.length)
    assert.equal(result.directory, join(root, JOB_ONE))
    assert.equal(result.inputPath, join(root, JOB_ONE, "input.tmp"))
    assert.deepEqual(await readFile(result.inputPath), jpeg)
    await removeSuccess(result)
  })
})

test("reconoce PNG por su firma y no declara que Sharp lo haya decodificado", async () => {
  await withRoot(async (root) => {
    const png = await tinyPng()
    const result = await receiveMediaUpload(multipart(filePart(byteStream(png), { mime: "application/octet-stream" })), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE })
    assert.equal(result.inputFormat, "png")
    assert.equal(result.bytes, png.length)
    await removeSuccess(result)
  })
})

test("admite exactamente 10.000.000 bytes sin acumularlos en un Buffer", async () => {
  await withRoot(async (root) => {
    const payload = (async function* () {
      yield Buffer.from([0xff, 0xd8, 0xff])
      for (let remaining = IMAGE_MAX_BYTES - 3; remaining > 0;) {
        const length = Math.min(64 * 1024, remaining)
        yield Buffer.alloc(length, 0x5a)
        remaining -= length
      }
    })()
    const result = await receiveMediaUpload(multipart(filePart(payload)), HEADERS, { temporaryRoot: root, jobId: JOB_ONE })
    assert.equal(result.bytes, IMAGE_MAX_BYTES)
    assert.equal((await stat(result.inputPath)).size, IMAGE_MAX_BYTES)
    await removeSuccess(result)
  })
})

test("rechaza el primer byte por encima del límite y limpia después de cerrar streams", async () => {
  await withRoot(async (root) => {
    const payload = (async function* () {
      yield Buffer.from([0xff, 0xd8, 0xff])
      for (let remaining = IMAGE_MAX_BYTES - 2; remaining > 0;) {
        const length = Math.min(64 * 1024, remaining)
        yield Buffer.alloc(length, 0x61)
        remaining -= length
      }
    })()
    const source = multipart(filePart(payload))
    await assert.rejects(receiveMediaUpload(source, HEADERS, { temporaryRoot: root, jobId: JOB_ONE }), errorCode("FILE_TOO_LARGE"))
    assert.equal(source.closed, true)
    assert.deepEqual(await readdir(root), [])
  })
})

test("rechaza bytes exóticos aunque el cliente declare MIME JPEG", async () => {
  await withRoot(async (root) => {
    const source = multipart(filePart(byteStream(Buffer.from("not an image")), { mime: "image/jpeg" }))
    await assert.rejects(receiveMediaUpload(source, HEADERS, { temporaryRoot: root, jobId: JOB_ONE }), errorCode("UNSUPPORTED_FORMAT"))
    assert.equal(source.closed, true)
    assert.deepEqual(await readdir(root), [])
  })
})

test("rechaza formulario parcial, ausencia de archivo, campo inesperado y segundo archivo", async () => {
  await withRoot(async (root) => {
    const jpeg = await tinyJpeg()
    await assert.rejects(receiveMediaUpload(multipart(filePart(byteStream(jpeg)), { closeForm: false }), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE }), errorCode("INVALID_MULTIPART"))
    await assert.rejects(receiveMediaUpload(multipart((async function* () {})()), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE }), errorCode("FILE_REQUIRED"))
    await assert.rejects(receiveMediaUpload(multipart(filePart(byteStream(jpeg), { field: "wrong" })), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE }), errorCode("UNEXPECTED_FILE_FIELD"))
    await assert.rejects(receiveMediaUpload(multipart(filePart(byteStream(jpeg)), { extraField: true }), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE }), errorCode("UNEXPECTED_TEXT_FIELD"))
    await assert.rejects(receiveMediaUpload(multipart(filePart(byteStream(jpeg)), { extraFile: true }), HEADERS,
      { temporaryRoot: root, jobId: JOB_ONE }), errorCode("TOO_MANY_FILES"))
    assert.deepEqual(await readdir(root), [])
  })
})

test("preabort y validación fallida no consumen el source ni crean workspace", async () => {
  await withRoot(async (root) => {
    let reads = 0
    const source = new Readable({ read() { reads += 1; this.push(null) } })
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(receiveMediaUpload(source, HEADERS, { temporaryRoot: root, jobId: JOB_ONE, signal: controller.signal }), errorCode("UPLOAD_ABORTED"))
    await assert.rejects(receiveMediaUpload(source, { "content-type": "application/json" }, { temporaryRoot: root, jobId: JOB_ONE }), errorCode("INVALID_UPLOAD_INPUT"))
    assert.equal(reads, 0)
    assert.deepEqual(await readdir(root), [])
  })
})

test("abort durante transferencia espera close físico antes de limpiar", async () => {
  await withRoot(async (root) => {
    const source = new SlowMultipartSource(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64 * 1024, 0x42)]))
    const controller = new AbortController()
    let observedHeader = false
    source.on("data", (chunk: Buffer) => {
      if (chunk.toString("utf8").includes("Content-Disposition")) observedHeader = true
      else if (observedHeader && !controller.signal.aborted) controller.abort()
    })
    await assert.rejects(receiveMediaUpload(source, HEADERS, { temporaryRoot: root, jobId: JOB_ONE, signal: controller.signal }), errorCode("UPLOAD_ABORTED"))
    assert.equal(source.closed, true)
    assert.deepEqual(await readdir(root), [])
  })
})

test("error y cierre prematuro de source no revelan detalle y limpian el archivo parcial", async () => {
  await withRoot(async (root) => {
    class BrokenSource extends Readable {
      private step = 0
      override _read(): void {
        this.step += 1
        if (this.step === 1) this.push(Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="x.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`))
        else if (this.step === 2) this.push(Buffer.from([0xff, 0xd8, 0xff, 0x10]))
        else this.destroy(new Error("private transport details"))
      }
    }
    const source = new BrokenSource()
    await assert.rejects(receiveMediaUpload(source, HEADERS, { temporaryRoot: root, jobId: JOB_ONE }), (error: unknown) =>
      error instanceof MediaUploadError && error.code === "UPLOAD_INTERRUPTED" && !error.message.includes("private"))
    assert.equal(source.closed, true)
    assert.deepEqual(await readdir(root), [])

    class EarlyCloseSource extends Readable {
      override _read(): void { this.destroy() }
    }
    const early = new EarlyCloseSource()
    await assert.rejects(receiveMediaUpload(early, HEADERS, { temporaryRoot: root, jobId: JOB_ONE }), errorCode("UPLOAD_INTERRUPTED"))
    assert.equal(early.closed, true)
    assert.deepEqual(await readdir(root), [])
  })
})

test("EEXIST y dos llamadas con el mismo UUID preservan el workspace anterior", async () => {
  await withRoot(async (root) => {
    const occupiedDirectory = join(root, JOB_ONE)
    await mkdir(occupiedDirectory, { mode: 0o700 })
    const oldInput = join(occupiedDirectory, "input.tmp")
    const oldVariant = join(occupiedDirectory, "image-2x2.png")
    await writeFile(oldInput, "prior input")
    await writeFile(oldVariant, "prior ready image")
    let reads = 0
    const untouched = new Readable({ read() { reads += 1; this.push(null) } })
    await assert.rejects(receiveMediaUpload(untouched, HEADERS, { temporaryRoot: root, jobId: JOB_ONE }), errorCode("WORKSPACE_EXISTS"))
    assert.equal(reads, 0)
    assert.equal(await readFile(oldInput, "utf8"), "prior input")
    assert.equal(await readFile(oldVariant, "utf8"), "prior ready image")
    await rm(occupiedDirectory, { recursive: true })
  })
})

test("dos UUID distintos reciben en paralelo sin borrar el espacio del otro", async () => {
  await withRoot(async (root) => {
    const secondId = "3b241101-e2bb-4255-8caf-4136c566a963"
    const jpeg = await tinyJpeg()
    const [first, second] = await Promise.all([
      receiveMediaUpload(multipart(filePart(byteStream(jpeg))), HEADERS, { temporaryRoot: root, jobId: JOB_ONE }),
      receiveMediaUpload(multipart(filePart(byteStream(jpeg))), HEADERS, { temporaryRoot: root, jobId: secondId }),
    ])
    assert.notEqual(first.directory, second.directory)
    assert.deepEqual((await readdir(root)).sort(), [JOB_ONE, secondId].sort())
    assert.deepEqual(await Promise.all([first, second].map(async ({ inputPath }) => readFile(inputPath))), [jpeg, jpeg])
    await Promise.all([removeSuccess(first), removeSuccess(second)])
  })
})

test("carrera por el mismo UUID crea solo un propietario y conserva su archivo", async () => {
  await withRoot(async (root) => {
    const jpeg = await tinyJpeg()
    const results = await Promise.allSettled([
      receiveMediaUpload(multipart(filePart(byteStream(jpeg))), HEADERS, { temporaryRoot: root, jobId: JOB_ONE }),
      receiveMediaUpload(multipart(filePart(byteStream(jpeg))), HEADERS, { temporaryRoot: root, jobId: JOB_ONE }),
    ])
    const accepted = results.filter((result): result is PromiseFulfilledResult<MediaUploadResult> => result.status === "fulfilled")
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected")
    assert.equal(accepted.length, 1)
    assert.equal(rejected.length, 1)
    assert.ok(rejected[0].reason instanceof MediaUploadError && rejected[0].reason.code === "WORKSPACE_EXISTS")
    assert.deepEqual(await readFile(accepted[0].value.inputPath), jpeg)
    await removeSuccess(accepted[0].value)
  })
})

// 📚 rmdir debe fallar ante un archivo ajeno: conservarlo y registrar limpieza pendiente
// 📚 es preferible a un borrado recursivo que elimine resultados de otra responsabilidad.
test("un resto ajeno se conserva y deja cleanup pendiente tras un fallo", async () => {
  await withRoot(async (root) => {
    const directory = join(root, JOB_ONE)
    const untouched = join(directory, "keep.txt")
    const payload = (async function* () {
      await writeFile(untouched, "conservar", { flag: "wx" })
      yield Buffer.from("not-an-image")
    })()
    await assert.rejects(
      receiveMediaUpload(multipart(filePart(payload)), HEADERS, { temporaryRoot: root, jobId: JOB_ONE }),
      (error: unknown) => error instanceof MediaUploadError
        && error.code === "UNSUPPORTED_FORMAT"
        && error.cleanupPendingDirectory === directory,
    )
    assert.equal(await readFile(untouched, "utf8"), "conservar")
    assert.deepEqual(await readdir(directory), ["keep.txt"])
  })
})

test("rechaza root symlink sin seguirlo para crear datos", async (t: TestContext) => {
  await withRoot(async (root) => {
    const link = join(root, "root-link")
    try {
      await symlink(root, link, "junction")
    } catch {
      t.skip("La plataforma no permitió crear un junction para esta prueba")
      return
    }
    const target = join(link, JOB_ONE)
    await assert.rejects(receiveMediaUpload(multipart(filePart(byteStream(await tinyJpeg()))), HEADERS,
      { temporaryRoot: link, jobId: JOB_ONE }), errorCode("INVALID_WORKSPACE"))
    assert.deepEqual(await readdir(root), ["root-link"])
    assert.deepEqual(await readdir(target).catch(() => []), [])
  })
})
