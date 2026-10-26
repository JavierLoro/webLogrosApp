import { createHash } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"

const WIDTH = 6000
const HEIGHT = 4000
const TARGET_BYTES = 10_000_000
const MAX_BYTES = TARGET_BYTES
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export type BenchmarkCorpusEntry = {
  name: "jpeg-textured" | "png-transparent"
  path: string
  format: "jpeg" | "png"
  width: number
  height: number
  bytes: number
  sha256: string
  paddingBytes: number
  description: string
}

// 📚 El CRC cubre tipo + datos según PNG; el checksum permite añadir metadatos
// 📚 de padding sin que los lectores rechacen el archivo por integridad.
export function pngCrc32(input: Buffer): number {
  let crc = 0xffffffff
  for (const byte of input) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const result = Buffer.allocUnsafe(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  body.copy(result, 4)
  result.writeUInt32BE(pngCrc32(body), data.length + 8)
  return result
}

function findPngIend(input: Buffer): number {
  if (!input.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("INVALID_PNG_SIGNATURE")
  let offset = 8
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset)
    if (length > input.length - offset - 12) throw new Error("INVALID_PNG_CHUNK")
    if (input.toString("ascii", offset + 4, offset + 8) === "IEND") return offset
    offset += length + 12
  }
  throw new Error("PNG_IEND_MISSING")
}

// 📚 PNG admite bloques auxiliares antes de IEND. Un solo tEXt con relleno
// 📚 exacto evita inflar la imagen con bytes ajenos al formato.
export function padPngToSize(input: Buffer, targetBytes = TARGET_BYTES): { data: Buffer; paddingBytes: number } {
  if (input.length > targetBytes) throw new Error("PNG_EXCEEDS_TARGET")
  const gap = targetBytes - input.length
  if (gap === 0) return { data: input, paddingBytes: 0 }
  if (gap < 12 + Buffer.byteLength("benchmark-padding\0")) throw new Error("PNG_PADDING_GAP_TOO_SMALL")
  const textData = Buffer.alloc(gap - 12)
  Buffer.from("benchmark-padding\0").copy(textData)
  const at = findPngIend(input)
  const padding = pngChunk("tEXt", textData)
  return { data: Buffer.concat([input.subarray(0, at), padding, input.subarray(at)]), paddingBytes: padding.length }
}

function findJpegSos(input: Buffer): number {
  if (input[0] !== 0xff || input[1] !== 0xd8) throw new Error("INVALID_JPEG_SIGNATURE")
  let offset = 2
  while (offset < input.length) {
    if (input[offset] !== 0xff) throw new Error("INVALID_JPEG_MARKER")
    while (input[offset] === 0xff) offset++
    const marker = input[offset++]
    if (marker === 0xda) return offset - 2
    if (marker === 0xd9 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (offset + 2 > input.length) throw new Error("INVALID_JPEG_SEGMENT")
    const length = input.readUInt16BE(offset)
    if (length < 2 || offset + length > input.length) throw new Error("INVALID_JPEG_SEGMENT")
    offset += length
  }
  throw new Error("JPEG_SOS_MISSING")
}

// 📚 Cada COM tiene longitud propia de 16 bits. Se reparten los bytes en varios
// 📚 segmentos y se insertan antes de SOS para mantener intacta la entropía JPEG.
export function padJpegToSize(input: Buffer, targetBytes = TARGET_BYTES): { data: Buffer; paddingBytes: number } {
  if (input.length > targetBytes) throw new Error("JPEG_EXCEEDS_TARGET")
  const gap = targetBytes - input.length
  if (gap === 0) return { data: input, paddingBytes: 0 }
  const segments: Buffer[] = []
  let remaining = gap
  while (remaining > 0) {
    if (remaining < 4) throw new Error("JPEG_PADDING_GAP_TOO_SMALL")
    const total = Math.min(remaining, 65_537)
    const payloadLength = total - 4
    const segment = Buffer.alloc(total)
    segment[0] = 0xff
    segment[1] = 0xfe
    segment.writeUInt16BE(payloadLength + 2, 2)
    // Padding data stays deterministic and does not retain arbitrary memory.
    segment.fill(0x42, 4)
    segments.push(segment)
    remaining -= total
  }
  const at = findJpegSos(input)
  return { data: Buffer.concat([input.subarray(0, at), ...segments, input.subarray(at)]), paddingBytes: gap }
}

function sceneSvg(alpha: boolean, seed: number): Buffer {
  // 📚 A compact SVG description lets libvips rasterize all 24 MP directly,
  // 📚 avoiding a second 72–96 MB raw pixel buffer in the benchmark process.
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 0x1_0000_0000
  }
  const spots = Array.from({ length: 180 }, (_, index) => {
    const x = Math.round(random() * WIDTH)
    const y = Math.round(random() * HEIGHT)
    const radius = 8 + Math.round(random() * 140)
    const hue = (index * 47 + 31) % 360
    const opacity = (0.12 + random() * 0.32).toFixed(3)
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="hsl(${hue} 78% 55%)" opacity="${opacity}"/>`
  }).join("")
  const alphaStops = alpha ? ` stop-opacity=".18"` : ""
  const alphaMid = alpha ? ` stop-opacity=".92"` : ""
  const alphaEnd = alpha ? ` stop-opacity=".32"` : ""
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="6000" height="4000"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#12335e"${alphaStops}/><stop offset=".5" stop-color="#e67845"${alphaMid}/><stop offset="1" stop-color="#f5d77b"${alphaEnd}/></linearGradient><pattern id="p" width="96" height="96" patternUnits="userSpaceOnUse"><rect width="48" height="48" fill="#fff" opacity=".22"/><rect x="48" y="48" width="48" height="48" fill="#07182a" opacity=".28"/><path d="M0 24H96M24 0V96" stroke="#fff" stroke-opacity=".25" stroke-width="3"/></pattern></defs><rect width="6000" height="4000" fill="url(#g)"/><rect width="6000" height="4000" fill="url(#p)"/>${spots}<path d="M0 3200 Q1300 1800 2600 3000T6000 1700V4000H0Z" fill="#18a999" opacity=".58"/><path d="M0 900 Q1700 1900 3200 500T6000 1200" fill="none" stroke="#fff" stroke-width="44" opacity=".72"/></svg>`)
}

async function encodeJpeg(): Promise<Buffer> {
  // 📚 La calidad baja solo si el codificador supera el máximo; el límite de
  // 📚 intentos impide un bucle de ajuste sin fin ante una versión distinta.
  for (const quality of [88, 84, 80, 76, 72]) {
    const encoded = await sharp(sceneSvg(false, 0x4c423031), { limitInputPixels: 24_000_000 })
      .jpeg({ quality, chromaSubsampling: "4:4:4", mozjpeg: true })
      .toBuffer()
    if (encoded.length <= MAX_BYTES - 100_000) return encoded
  }
  throw new Error("JPEG_CANNOT_FIT_WITHIN_TARGET")
}

async function encodePng(): Promise<Buffer> {
  // 📚 La compresión se prueba con parámetros acotados. La escena tiene color,
  // 📚 alpha, geometría y textura; el bloque tEXt acerca su tamaño al límite.
  for (const compressionLevel of [6, 9, 4]) {
    const encoded = await sharp(sceneSvg(true, 0x4c423032), { limitInputPixels: 24_000_000 })
      .png({ compressionLevel, adaptiveFiltering: false, palette: false })
      .toBuffer()
    if (encoded.length <= MAX_BYTES - 100_000) return encoded
  }
  throw new Error("PNG_CANNOT_FIT_WITHIN_TARGET")
}

async function validateImage(data: Buffer, format: "jpeg" | "png"): Promise<void> {
  if (data.length > MAX_BYTES) throw new Error("CORPUS_IMAGE_TOO_LARGE")
  const metadata = await sharp(data, { limitInputPixels: 24_000_000, failOn: "warning" }).metadata()
  if (metadata.format !== format || metadata.width !== WIDTH || metadata.height !== HEIGHT || (metadata.pages ?? 1) !== 1) {
    throw new Error("CORPUS_IMAGE_INVALID_METADATA")
  }
  if (format === "png" && !metadata.hasAlpha) throw new Error("CORPUS_PNG_ALPHA_MISSING")
  // 📚 La decodificación reducida confirma que los datos comprimidos son legibles
  // 📚 sin materializar los 96 MB de píxeles originales para la validación.
  const decoded = await sharp(data, { limitInputPixels: 24_000_000, failOn: "warning" }).resize(96, 64).ensureAlpha().raw().toBuffer()
  if (decoded.length === 0) throw new Error("CORPUS_IMAGE_DECODE_FAILED")
  const sampledColors = new Set<string>()
  let minAlpha = 255
  let maxAlpha = 0
  for (let index = 0; index < decoded.length; index += 4) {
    sampledColors.add(`${decoded[index]},${decoded[index + 1]},${decoded[index + 2]}`)
    minAlpha = Math.min(minAlpha, decoded[index + 3])
    maxAlpha = Math.max(maxAlpha, decoded[index + 3])
  }
  if (sampledColors.size < 8) throw new Error("CORPUS_IMAGE_CONTENT_TOO_FLAT")
  if (format === "png" && minAlpha === maxAlpha) throw new Error("CORPUS_PNG_ALPHA_NOT_VARIABLE")
}

// 📚 Este generador se ejecuta antes del ensayo medido y escribe fuentes fijas
// 📚 en disco; SHA-256 permite comprobar que Windows/Linux recibieron el mismo corpus.
export async function generateBenchmarkCorpus(directory: string): Promise<BenchmarkCorpusEntry[]> {
  await mkdir(directory, { recursive: true })
  const specs = [
    { name: "jpeg-textured" as const, format: "jpeg" as const, source: await encodeJpeg(), description: "24 MP, gradientes, tablero y 180 círculos deterministas; JPEG con padding COM legal." },
    { name: "png-transparent" as const, format: "png" as const, source: await encodePng(), description: "24 MP, alpha variable, gradientes, tablero y formas deterministas; PNG con tEXt legal." },
  ]
  const entries: BenchmarkCorpusEntry[] = []
  for (const spec of specs) {
    const padded = spec.format === "jpeg" ? padJpegToSize(spec.source) : padPngToSize(spec.source)
    await validateImage(padded.data, spec.format)
    const path = join(directory, `${spec.name}.${spec.format}`)
    await writeFile(path, padded.data)
    entries.push({
      name: spec.name,
      path,
      format: spec.format,
      width: WIDTH,
      height: HEIGHT,
      bytes: padded.data.length,
      sha256: createHash("sha256").update(padded.data).digest("hex"),
      paddingBytes: padded.paddingBytes,
      description: `${spec.description} sharp=${sharp.versions.sharp}; sharp-libvips=${sharp.versions.vips}.`,
    })
  }
  return entries
}
