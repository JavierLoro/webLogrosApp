import assert from "node:assert/strict"
import { fork } from "node:child_process"
import { lstat, mkdtemp, readFile, readdir, realpath, rm, writeFile, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, extname, join, resolve } from "node:path"
import { test } from "node:test"
import sharp from "sharp"
import { executeMediaImage } from "./mediaImageExecutor"
import { IMAGE_MAX_BYTES, MediaImageError, type ImageErrorCode } from "./mediaImageProtocol"

// 📚 Pruebas de integración con un proceso Node/Sharp real y archivos sintéticos.
// 📚 No usan BD, Docker, fotos personales, S3 ni el servidor HTTP.
async function workspace(input: Buffer, run: (directory: string) => Promise<void>): Promise<void> {
  const parent = await realpath(tmpdir())
  const directory = await realpath(await mkdtemp(join(parent, "lockerboard-executor-test-")))
  try {
    await writeFile(join(directory, "input.tmp"), input)
    await run(directory)
  } finally {
    // 📚 El borrado recursivo solo alcanza la carpeta única creada por esta prueba.
    assert.equal(dirname(directory), parent)
    assert.equal(await realpath(directory), directory)
    assert.ok(directory.startsWith(join(parent, "lockerboard-executor-test-")))
    await rm(directory, { recursive: true, force: false })
  }
}

function errorCode(code: ImageErrorCode): (error: unknown) => boolean {
  return (error) => error instanceof MediaImageError && error.code === code && !error.cleanupPendingDirectory
}
function assertStopped(pid: number): void {
  assert.ok(pid > 0)
  assert.throws(() => process.kill(pid, 0), (error: unknown) =>
    error instanceof Error && "code" in error && error.code === "ESRCH")
}
const jpeg = (width: number, height: number) => sharp({
  create: { width, height, channels: 3, background: "red" },
}).jpeg().toBuffer()

test("trabajador real genera tamaños de logro y solo devuelve después de cerrar", async () => {
  const input = await jpeg(1600, 800)
  await workspace(input, async (directory) => {
    let pid = 0
    const result = await executeMediaImage({ directory, kind: "achievement" }, {
      onPhase: (event) => { pid = event.pid },
    })
    assertStopped(pid)
    assert.deepEqual(result.variants.map((v) => [v.width, v.height]), [[1280, 640], [640, 320], [320, 160]])
    for (const variant of result.variants) {
      const file = await readFile(join(result.outputDirectory, variant.filename))
      assert.equal(file.length, variant.bytes)
      const metadata = await sharp(file).metadata()
      assert.deepEqual([metadata.width, metadata.height, metadata.format], [variant.width, variant.height, "jpeg"])
    }
    assert.deepEqual(await readFile(join(directory, "input.tmp")), input)
  })
})

test("JPEG se orienta y retira metadatos sin ampliar ni duplicar la fuente pequeña", async () => {
  const input = await sharp({ create: { width: 80, height: 40, channels: 3, background: "red" } })
    .withMetadata({ orientation: 6 }).withExif({ IFD0: { Artist: "synthetic test" } }).jpeg().toBuffer()
  await workspace(input, async (directory) => {
    const result = await executeMediaImage({ directory, kind: "achievement" })
    assert.equal(result.variants.length, 1)
    const metadata = await sharp(await readFile(join(result.outputDirectory, result.variants[0].filename))).metadata()
    assert.deepEqual([metadata.width, metadata.height, metadata.space], [40, 80, "srgb"])
    for (const value of [metadata.exif, metadata.xmp, metadata.icc, metadata.iptc, metadata.orientation]) assert.equal(value, undefined)
  })
})

test("PNG mantiene transparencia y proporción, sin convertir a paleta", async () => {
  const input = await sharp({ create: { width: 1024, height: 512, channels: 4, background: { r: 20, g: 80, b: 160, alpha: 0.5 } } }).png().toBuffer()
  await workspace(input, async (directory) => {
    const result = await executeMediaImage({ directory, kind: "logo" })
    assert.deepEqual(result.variants.map((v) => [v.width, v.height]), [[512, 256], [128, 64]])
    for (const variant of result.variants) {
      const file = await readFile(join(result.outputDirectory, variant.filename))
      assert.equal(file[25], 6)
      assert.equal((await sharp(file).raw().toBuffer())[3], 128)
    }
  })
})

test("avatar necesita encuadre cuadrado y produce 256/96", async () => {
  await workspace(await jpeg(512, 512), async (directory) => {
    const result = await executeMediaImage({ directory, kind: "avatar" })
    assert.deepEqual(result.variants.map((v) => [v.width, v.height]), [[256, 256], [96, 96]])
  })
  await workspace(await jpeg(512, 256), async (directory) => {
    await assert.rejects(executeMediaImage({ directory, kind: "avatar" }), errorCode("AVATAR_CROP_REQUIRED"))
    assert.deepEqual(await readdir(directory), ["input.tmp"])
  })
})

test("rechazos de formato, archivo dañado, bytes y píxeles limpian solo su intento", async () => {
  const cases: [Buffer, ImageErrorCode][] = [
    [await sharp({ create: { width: 4, height: 4, channels: 3, background: "red" } }).webp().toBuffer(), "UNSUPPORTED_FORMAT"],
    [Buffer.from([0xff, 0xd8, 0xff, 0]), "IMAGE_INVALID"],
    [Buffer.alloc(IMAGE_MAX_BYTES + 1), "IMAGE_TOO_LARGE"],
    [await jpeg(6000, 4001), "IMAGE_TOO_MANY_PIXELS"],
  ]
  for (const [input, code] of cases) await workspace(input, async (directory) => {
    await mkdir(join(directory, "variants-previous"))
    await writeFile(join(directory, "variants-previous", "keep.txt"), "previous ready image")
    await assert.rejects(executeMediaImage({ directory, kind: "logo" }), errorCode(code))
    assert.deepEqual((await readdir(directory)).sort(), ["input.tmp", "variants-previous"])
    assert.equal(await readFile(join(directory, "variants-previous", "keep.txt"), "utf8"), "previous ready image")
  })
})

test("PNG con bloque acTL se rechaza incluso si Sharp lo considera una página", async () => {
  const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: "red" } }).png().toBuffer()
  const payload = Buffer.alloc(8)
  payload.writeUInt32BE(1)
  const chunkData = Buffer.concat([Buffer.from("acTL"), payload])
  let crc = 0xffffffff
  for (const byte of chunkData) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const length = Buffer.alloc(4); length.writeUInt32BE(payload.length)
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  const input = Buffer.concat([png.subarray(0, 33), length, chunkData, checksum, png.subarray(33)])
  assert.equal((await sharp(input).metadata()).pages ?? 1, 1)
  await workspace(input, async (directory) => {
    await assert.rejects(executeMediaImage({ directory, kind: "logo" }), errorCode("ANIMATED_IMAGE"))
    assert.deepEqual(await readdir(directory), ["input.tmp"])
  })
})

test("cancelación previa no crea salidas ni arranca un trabajador", async () => {
  await workspace(await jpeg(4, 4), async (directory) => {
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(executeMediaImage({ directory, kind: "logo" }, { signal: controller.signal,
      onPhase: () => assert.fail("No debe arrancar"),
    }), errorCode("CANCELED"))
    assert.deepEqual(await readdir(directory), ["input.tmp"])
  })
})

test("cancelar una transformación real espera cierre y conserva entrada/imagen anterior", async () => {
  await workspace(await jpeg(6000, 4000), async (directory) => {
    const controller = new AbortController()
    let pid = 0
    let settled = false
    await mkdir(join(directory, "variants-previous"))
    const execution = executeMediaImage({ directory, kind: "achievement" }, {
      signal: controller.signal,
      onPhase: (event) => {
        pid = event.pid
        if (event.phase === "transforming") {
          controller.abort()
          assert.equal(settled, false)
        }
      },
    })
    execution.then(() => { settled = true }, () => { settled = true })
    await assert.rejects(execution, errorCode("CANCELED"))
    assertStopped(pid)
    assert.deepEqual((await readdir(directory)).sort(), ["input.tmp", "variants-previous"])
    assert.ok((await lstat(join(directory, "input.tmp"))).size > 0)
  })
})

test("timeout durante trabajo real cierra Sharp y retira sus salidas", async () => {
  await workspace(await jpeg(6000, 4000), async (directory) => {
    let pid = 0
    await assert.rejects(executeMediaImage({ directory, kind: "achievement" }, {
      processingTimeoutMs: 1, onPhase: (event) => { pid = event.pid },
    }), errorCode("PROCESSING_TIMEOUT"))
    assertStopped(pid)
    assert.deepEqual(await readdir(directory), ["input.tmp"])
    await assert.rejects(executeMediaImage({ directory, kind: "logo" }, { processingTimeoutMs: 30_001 }), RangeError)
  })
})

test("caída inesperada del trabajador no se confunde con éxito y limpia el intento", async () => {
  await workspace(await jpeg(6000, 4000), async (directory) => {
    let pid = 0
    await assert.rejects(executeMediaImage({ directory, kind: "achievement" }, {
      onPhase: (event) => {
        pid = event.pid
        // 📚 Solo interrumpimos el PID que esta ejecución acaba de crear.
        if (event.phase === "transforming") process.kill(pid, "SIGKILL")
      },
    }), errorCode("WORKER_FAILED"))
    assertStopped(pid)
    assert.deepEqual(await readdir(directory), ["input.tmp"])
  })
})

test("perder el canal del padre detiene al trabajador; la recuperación limpiará restos", async () => {
  await workspace(await jpeg(6000, 4000), async (directory) => {
    const outputDirectory = await mkdtemp(join(directory, "variants-"))
    const compiled = extname(__filename) === ".js"
    const child = fork(join(__dirname, `mediaImageWorker.${compiled ? "js" : "ts"}`), [], {
      cwd: resolve(__dirname, "../.."),
      execArgv: compiled ? [] : ["-r", require.resolve("ts-node/register")],
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    })
    const pid = child.pid!
    await new Promise<void>((resolveClosed, rejectClosed) => {
      const watchdog = setTimeout(() => {
        child.kill("SIGKILL")
        rejectClosed(new Error("El trabajador no se detuvo al perder IPC"))
      }, 10_000)
      let disconnected = false
      child.on("message", (raw) => {
        const message = raw as { type: string }
        if (message.type === "ready") child.send({ kind: "achievement", inputPath: join(directory, "input.tmp"), outputDirectory })
        if (message.type === "transforming" && !disconnected) {
          disconnected = true
          child.disconnect()
        }
      })
      child.on("error", rejectClosed)
      // 📚 Esta prueba corta IPC deliberadamente y solo comprueba la muerte
      // 📚 del trabajador. El ejecutor normal mantiene IPC hasta close.
      child.once("exit", (code) => {
        clearTimeout(watchdog)
        try {
          assert.equal(disconnected, true)
          assert.equal(code, 1)
          resolveClosed()
        } catch (error) { rejectClosed(error) }
      })
    })
    assertStopped(pid)
    // 📚 Sin controlador vivo no hay limpieza automática. No llamamos a esto
    // 📚 recuperación durable; el futuro reconciliador retirará estos restos.
    assert.ok((await lstat(outputDirectory)).isDirectory())
  })
})
