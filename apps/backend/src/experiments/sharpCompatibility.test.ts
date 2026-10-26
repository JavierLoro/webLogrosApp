import assert from "node:assert/strict"
import { test } from "node:test"
import { deflateSync } from "node:zlib"
// 📚 Sharp incluye sus tipos: OutputInfo se importa como type y no añade código JS.
import sharp, { type OutputInfo } from "sharp"

// 📚 Ensayo T02.02, aislado de server.ts: verifica las herramientas y reglas elegidas.
// 📚 Las imágenes se generan en memoria; no hay originales personales ni escrituras S3.
const MAX_BYTES = 10_000_000
const MAX_PIXELS = 24_000_000
const EDGES = { achievement: [1280, 640, 320], logo: [512, 128], avatar: [256, 96] }
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

// 📚 PNG contiene bloques con longitud/tipo/datos/CRC. Revisamos bloques reales,
// 📚 no buscamos texto acTL dentro de los datos comprimidos (daría falsos positivos).
function pngChunkTypes(input: Buffer): string[] {
  assert.ok(input.subarray(0, 8).equals(PNG_SIGNATURE))
  const types: string[] = []
  let offset = 8
  while (offset < input.length) {
    if (offset + 12 > input.length) throw new Error("INVALID_PNG_CHUNK")
    const length = input.readUInt32BE(offset)
    if (length > input.length - offset - 12) throw new Error("INVALID_PNG_CHUNK")
    types.push(input.toString("ascii", offset + 4, offset + 8))
    offset += length + 12
  }
  return types
}

// 📚 El prototipo conserva formato, proporción y transparencia. Para avatar usamos
// 📚 entrada ya cuadrada: el encuadre elegido en la UI se diseñará en T03/T07.
async function variantsForProbe(input: Buffer, kind: keyof typeof EDGES) {
  if (input.byteLength > MAX_BYTES) throw new Error("FILE_TOO_LARGE")
  const options = { limitInputPixels: MAX_PIXELS, failOn: "warning" as const }
  const metadata = await sharp(input, options).metadata()
  if (metadata.format !== "jpeg" && metadata.format !== "png") throw new Error("UNSUPPORTED_FORMAT")
  if ((metadata.pages ?? 1) !== 1) throw new Error("ANIMATED_IMAGE")
  // 📚 APNG puede decodificarse como primera imagen sin pages > 1. Su bloque acTL
  // 📚 exige un rechazo explícito para cumplir «PNG estático solamente».
  if (metadata.format === "png" && pngChunkTypes(input).includes("acTL")) throw new Error("ANIMATED_IMAGE")
  if (kind === "avatar" && metadata.width !== metadata.height) throw new Error("AVATAR_CROP_REQUIRED")

  const outputs: { data: Buffer; info: OutputInfo }[] = []
  const dimensions = new Set<string>()
  for (const edge of EDGES[kind]) {
    const image = sharp(input, options)
      // 📚 Primero aplicamos orientación y convertimos color; la salida elimina
      // 📚 metadatos por defecto, sin keepMetadata/withMetadata en este recorrido.
      .autoOrient()
      .toColourspace("srgb")
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
    if (metadata.format === "jpeg") image.jpeg({ quality: 85 })
    else image.png({ palette: false })
    const output = await image.toBuffer({ resolveWithObject: true })
    const key = `${output.info.width}x${output.info.height}`
    // 📚 Una fuente pequeña puede dar el mismo tamaño en varias peticiones:
    // 📚 el conjunto final conserva una sola variante de cada dimensión.
    if (!dimensions.has(key)) {
      dimensions.add(key)
      outputs.push(output)
    }
  }
  return outputs
}

// 📚 Fixture mínima con dos fotogramas APNG válidos; el CRC protege cada bloque.
// 📚 Se genera aquí para que el ensayo sea reproducible sin descargar imágenes.
function pngChunk(type: string, data: Buffer): Buffer {
  const payload = Buffer.concat([Buffer.from(type), data])
  let crc = 0xffffffff
  for (const byte of payload) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0)
  }
  const length = Buffer.alloc(4)
  const checksum = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0)
  return Buffer.concat([length, payload, checksum])
}

function animatedPng(): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(2, 0)
  header.writeUInt32BE(2, 4)
  header[8] = 8
  header[9] = 6
  const animation = Buffer.alloc(8)
  animation.writeUInt32BE(2, 0)
  const control = (sequence: number): Buffer => {
    const data = Buffer.alloc(26)
    data.writeUInt32BE(sequence, 0)
    data.writeUInt32BE(2, 4)
    data.writeUInt32BE(2, 8)
    data.writeUInt16BE(1, 20)
    data.writeUInt16BE(10, 22)
    return data
  }
  const frame = (r: number, b: number) => deflateSync(Buffer.from([
    0, r, 0, b, 255, r, 0, b, 255,
    0, r, 0, b, 255, r, 0, b, 255,
  ]))
  const sequence = Buffer.alloc(4)
  sequence.writeUInt32BE(2)
  return Buffer.concat([
    PNG_SIGNATURE, pngChunk("IHDR", header), pngChunk("acTL", animation),
    pngChunk("fcTL", control(0)), pngChunk("IDAT", frame(255, 0)),
    pngChunk("fcTL", control(1)), pngChunk("fdAT", Buffer.concat([sequence, frame(0, 255)])),
    pngChunk("IEND", Buffer.alloc(0)),
  ])
}

test("JPEG se orienta antes de retirar EXIF/XMP/ICC", async () => {
  const input = await sharp({ create: { width: 80, height: 40, channels: 3, background: "red" } })
    .withMetadata({ orientation: 6 })
    .withExif({ IFD0: { Artist: "LockerBoard synthetic author" } })
    .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:dc="http://purl.org/dc/elements/1.1/" dc:creator="synthetic"/></rdf:RDF></x:xmpmeta>')
    .jpeg().toBuffer()
  const before = await sharp(input).metadata()
  assert.equal(before.orientation, 6)
  assert.ok(before.exif)
  assert.ok(before.xmp)
  assert.ok(before.icc)
  const outputs = await variantsForProbe(input, "achievement")
  assert.equal(outputs.length, 1)
  const after = await sharp(outputs[0].data).metadata()
  assert.deepEqual([after.width, after.height], [40, 80])
  assert.equal(after.format, "jpeg")
  assert.equal(after.space, "srgb")
  for (const value of [after.exif, after.xmp, after.icc, after.iptc, after.orientation]) assert.equal(value, undefined)
})

test("logo PNG conserva proporción, transparencia y salida sin paleta", async () => {
  const input = await sharp({ create: { width: 1024, height: 512, channels: 4, background: { r: 20, g: 80, b: 160, alpha: 0.5 } } }).png().toBuffer()
  const outputs = await variantsForProbe(input, "logo")
  assert.deepEqual(outputs.map(({ info }) => [info.width, info.height]), [[512, 256], [128, 64]])
  for (const { data } of outputs) {
    const metadata = await sharp(data).metadata()
    assert.equal(metadata.format, "png")
    assert.equal(metadata.hasAlpha, true)
    assert.equal(data[25], 6) // 📚 IHDR tipo 6 = RGBA; tipo 3 sería paleta indexada.
    const pixels = await sharp(data).raw().toBuffer()
    assert.equal(pixels[3], 128)
  }
})

test("perfil Display P3 se convierte a sRGB antes de retirar el ICC", async () => {
  const original = [180, 60, 40]
  const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: original[0], g: original[1], b: original[2] } } })
    .withIccProfile("p3").png().toBuffer()
  assert.ok((await sharp(input).metadata()).icc)
  const [{ data }] = await variantsForProbe(input, "logo")
  const metadata = await sharp(data).metadata()
  assert.equal(metadata.space, "srgb")
  assert.equal(metadata.icc, undefined)
  const pixels = await sharp(data).raw().toBuffer()
  // 📚 La conversión de perfil redondea canales; toleramos 2 niveles sobre 255,
  // 📚 comprobando color además de comprobar que desaparece la etiqueta ICC.
  original.forEach((channel, index) => assert.ok(Math.abs(pixels[index] - channel) <= 2))
})

test("logro conserva la imagen completa en 1280/640/320", async () => {
  const input = await sharp({ create: { width: 1600, height: 800, channels: 3, background: "blue" } }).jpeg().toBuffer()
  const outputs = await variantsForProbe(input, "achievement")
  assert.deepEqual(outputs.map(({ info }) => [info.width, info.height]), [[1280, 640], [640, 320], [320, 160]])
})

test("avatar ya encuadrado genera 256/96; no se inventa encuadre", async () => {
  const input = await sharp({ create: { width: 512, height: 512, channels: 3, background: "green" } }).png().toBuffer()
  const outputs = await variantsForProbe(input, "avatar")
  assert.deepEqual(outputs.map(({ info }) => [info.width, info.height]), [[256, 256], [96, 96]])
  const rectangular = await sharp(input).resize(512, 256).png().toBuffer()
  await assert.rejects(variantsForProbe(rectangular, "avatar"), /AVATAR_CROP_REQUIRED/)
})

test("fuente pequeña no se amplía ni produce variantes duplicadas", async () => {
  const input = await sharp({ create: { width: 20, height: 10, channels: 3, background: "red" } }).png().toBuffer()
  const outputs = await variantsForProbe(input, "achievement")
  assert.equal(outputs.length, 1)
  assert.deepEqual([outputs[0].info.width, outputs[0].info.height], [20, 10])
})

test("24 MP se admiten; superar 24 MP se rechaza aunque ocupe pocos bytes", async () => {
  const input = await sharp({ create: { width: 6000, height: 4000, channels: 3, background: "red" } }).jpeg().toBuffer()
  assert.ok(input.byteLength < MAX_BYTES)
  assert.equal((await variantsForProbe(input, "achievement")).length, 3)
  const excessive = await sharp({ create: { width: 6000, height: 4001, channels: 3, background: "red" } }).jpeg().toBuffer()
  assert.ok(excessive.byteLength < MAX_BYTES)
  await assert.rejects(variantsForProbe(excessive, "achievement"), /pixel limit/i)
})

test("WebP, GIF y SVG se rechazan por contenido, sin confiar en un nombre JPG", async () => {
  const image = sharp({ create: { width: 2, height: 2, channels: 3, background: "red" } })
  for (const input of [await image.clone().webp().toBuffer(), await image.clone().gif().toBuffer(), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>')]) {
    await assert.rejects(variantsForProbe(input, "logo"), /UNSUPPORTED_FORMAT/)
  }
})

test("APNG se detecta por acTL aunque Sharp lea solo la primera imagen", async (t) => {
  const input = animatedPng()
  assert.equal(pngChunkTypes(input).filter((type) => type === "fcTL").length, 2)
  const metadata = await sharp(input).metadata()
  t.diagnostic(`APNG sintético: format=${metadata.format}, pages=${metadata.pages ?? 1}; guardia acTL activa`)
  await assert.rejects(variantsForProbe(input, "logo"), /ANIMATED_IMAGE/)
})

test("contenido inválido y JPEG truncado no producen variantes", async () => {
  await assert.rejects(variantsForProbe(Buffer.from("not an image"), "logo"))
  const jpeg = await sharp({ create: { width: 128, height: 128, channels: 3, background: "blue" } }).jpeg().toBuffer()
  await assert.rejects(variantsForProbe(jpeg.subarray(0, jpeg.length - 50), "logo"))
})

test("el límite de bytes se aplica antes de decodificar", async () => {
  await assert.rejects(variantsForProbe(Buffer.alloc(MAX_BYTES + 1), "logo"), /FILE_TOO_LARGE/)
})
