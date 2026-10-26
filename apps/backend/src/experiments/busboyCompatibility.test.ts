import assert from "node:assert/strict"
import { createWriteStream } from "node:fs"
import { mkdtemp, readFile, readdir, rmdir, stat, unlink } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import { test, TestContext } from "node:test"
import busboy from "busboy"

// 📚 Prototipo de viabilidad T02.02: no se importa desde server.ts ni abre una ruta.
// 📚 Prueba transporte/temporales; los bytes sintéticos NO prueban validación de imagen.
const MAX_BYTES = 10_000_000
const BOUNDARY = "lockerboard-busboy-probe"

type Received = { directory: string; path: string }

// 📚 Este receptor aislado permite probar la librería antes de diseñar la API y
// 📚 la admisión global. El nombre del cliente nunca se convierte en una ruta local.
async function receiveForProbe(source: Readable, root: string): Promise<Received> {
  const directory = await mkdtemp(join(root, "upload-"))
  const path = join(directory, "input.tmp")
  const controller = new AbortController()
  const writes: Promise<void>[] = []
  let failure: Error | undefined
  let files = 0
  const parser = busboy({
    headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
    // 📚 Busboy emite limit al ALCANZAR fileSize. +1 permite admitir exactamente
    // 📚 MAX_BYTES y rechazar el primer byte extra; fields/files acotan este ensayo.
    limits: { fileSize: MAX_BYTES + 1, files: 1, fields: 0 },
  })

  const fail = (error: Error): void => {
    failure ??= error
    // 📚 Cancelamos después del callback de Busboy, sin interrumpir su actualización
    // 📚 interna del evento limit; la señal detiene tanto lectura como escritura.
    queueMicrotask(() => controller.abort())
  }

  parser.on("file", (field, file) => {
    files += 1
    file.on("limit", () => fail(new Error("FILE_TOO_LARGE")))
    if (field !== "image") fail(new Error("UNEXPECTED_FILE_FIELD"))
    const write = pipeline(file, createWriteStream(path, { flags: "wx" }), { signal: controller.signal })
    writes.push(write)
    void write.catch(fail)
  })
  parser.on("filesLimit", () => fail(new Error("TOO_MANY_FILES")))
  parser.on("fieldsLimit", () => fail(new Error("UNEXPECTED_TEXT_FIELD")))

  try {
    // 📚 pipeline propaga errores y respeta la velocidad de escritura del disco
    // 📚 (backpressure), sin acumular el archivo completo en un Buffer del receptor.
    await pipeline(source, parser, { signal: controller.signal })
    await Promise.all(writes)
    if (failure) throw failure
    if (files !== 1) throw new Error("FILE_REQUIRED")
    return { directory, path }
  } catch (error) {
    controller.abort()
    // 📚 Esperamos a que el archivo se cierre ANTES de borrarlo, importante en Windows.
    await Promise.allSettled(writes)
    await unlink(path).catch((cleanupError: NodeJS.ErrnoException) => {
      if (cleanupError.code !== "ENOENT") throw cleanupError
    })
    await rmdir(directory)
    throw failure ?? error
  }
}

// 📚 Generamos el cuerpo por fragmentos para probar streaming sin abrir un servidor
// 📚 ni usar fotos personales. Incluso el nombre ../../ intenta engañar al receptor.
function multipart(size: number, options: { incomplete?: boolean; interrupted?: boolean; extraFile?: boolean; textField?: boolean } = {}): Readable {
  return Readable.from((async function* () {
    yield Buffer.from(`--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="../../outside.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`)
    for (let remaining = size; remaining > 0;) {
      const length = Math.min(remaining, 64 * 1024)
      yield Buffer.alloc(length, 0x61)
      remaining -= length
    }
    if (options.interrupted) throw new Error("INPUT_INTERRUPTED")
    if (options.incomplete) return
    if (options.extraFile) {
      yield Buffer.from(`\r\n--${BOUNDARY}\r\nContent-Disposition: form-data; name="image"; filename="second.jpg"\r\nContent-Type: image/jpeg\r\n\r\nx`)
    }
    if (options.textField) {
      yield Buffer.from(`\r\n--${BOUNDARY}\r\nContent-Disposition: form-data; name="extra"\r\n\r\nx`)
    }
    yield Buffer.from(`\r\n--${BOUNDARY}--\r\n`)
  })())
}

// 📚 Cada caso tiene un directorio propio; comprobamos que no quedan temporales.
// 📚 unlink/rmdir solo eliminan el archivo y directorios creados por este ensayo.
async function rootForTest(t: TestContext): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "lockerboard-busboy-probe-"))
  t.after(async () => {
    assert.deepEqual(await readdir(root), [])
    await rmdir(root)
  })
  return root
}

async function removeReceived(received: Received): Promise<void> {
  await unlink(received.path)
  await rmdir(received.directory)
}

test("Busboy conserva bytes y utiliza nombre interno", async (t) => {
  const root = await rootForTest(t)
  const received = await receiveForProbe(multipart(1024), root)
  try {
    assert.deepEqual(await readFile(received.path), Buffer.alloc(1024, 0x61))
    assert.equal(received.path, join(received.directory, "input.tmp"))
  } finally {
    await removeReceived(received)
  }
})

test("se admiten exactamente 10.000.000 bytes", async (t) => {
  const root = await rootForTest(t)
  const received = await receiveForProbe(multipart(MAX_BYTES), root)
  try {
    assert.equal((await stat(received.path)).size, MAX_BYTES)
  } finally {
    await removeReceived(received)
  }
})

test("un byte extra se rechaza y limpia el temporal", async (t) => {
  const root = await rootForTest(t)
  await assert.rejects(receiveForProbe(multipart(MAX_BYTES + 1), root), /FILE_TOO_LARGE/)
})

test("un formulario incompleto se rechaza y limpia el temporal", async (t) => {
  const root = await rootForTest(t)
  await assert.rejects(receiveForProbe(multipart(64 * 1024, { incomplete: true }), root), /Unexpected end of form/)
})

test("un flujo interrumpido se rechaza y limpia el temporal", async (t) => {
  const root = await rootForTest(t)
  await assert.rejects(receiveForProbe(multipart(64 * 1024, { interrupted: true }), root), /INPUT_INTERRUPTED/)
})

test("un segundo archivo se rechaza y limpia el temporal", async (t) => {
  const root = await rootForTest(t)
  await assert.rejects(receiveForProbe(multipart(1024, { extraFile: true }), root), /TOO_MANY_FILES/)
})

test("un campo de texto extra se rechaza y limpia el temporal", async (t) => {
  const root = await rootForTest(t)
  await assert.rejects(receiveForProbe(multipart(1024, { textField: true }), root), /UNEXPECTED_TEXT_FIELD/)
})

test("dos recepciones simultáneas utilizan temporales distintos", async (t) => {
  const root = await rootForTest(t)
  const results = await Promise.all([receiveForProbe(multipart(1024), root), receiveForProbe(multipart(2048), root)])
  try {
    assert.notEqual(results[0].directory, results[1].directory)
    assert.deepEqual(await Promise.all(results.map(async (file) => (await stat(file.path)).size)), [1024, 2048])
  } finally {
    await Promise.all(results.map(removeReceived))
  }
})
