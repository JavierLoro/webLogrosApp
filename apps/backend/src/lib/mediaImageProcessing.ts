import { createReadStream } from "node:fs"
import { lstat, writeFile } from "node:fs/promises"
import { join } from "node:path"
import sharp from "sharp"
import { IMAGE_EDGES, IMAGE_MAX_BYTES, IMAGE_MAX_PIXELS, MediaImageError, type ImageKind, type ImageManifest } from "./mediaImageProtocol"

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

// 📚 Solo el trabajo activo carga su archivo comprimido. La lectura limitada
// 📚 también detecta crecimiento del archivo después del stat inicial.
async function readInput(inputPath: string): Promise<Buffer> {
  const file = await lstat(inputPath)
  if (!file.isFile() || file.isSymbolicLink()) throw new MediaImageError("INVALID_WORKSPACE")
  if (file.size > IMAGE_MAX_BYTES) throw new MediaImageError("IMAGE_TOO_LARGE")
  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of createReadStream(inputPath, { highWaterMark: 64 * 1024 })) {
    const data = chunk as Buffer
    bytes += data.length
    if (bytes > IMAGE_MAX_BYTES) throw new MediaImageError("IMAGE_TOO_LARGE")
    chunks.push(data)
  }
  return Buffer.concat(chunks, bytes)
}

// 📚 Sharp puede leer un APNG como una sola página. Inspeccionar sus bloques
// 📚 reales acTL evita aceptar una animación o confundir texto con un bloque.
function rejectAnimatedPng(input: Buffer): void {
  let offset = 8
  let ended = false
  while (offset < input.length) {
    if (offset + 12 > input.length) throw new MediaImageError("IMAGE_INVALID")
    const length = input.readUInt32BE(offset)
    if (length > input.length - offset - 12) throw new MediaImageError("IMAGE_INVALID")
    const type = input.toString("ascii", offset + 4, offset + 8)
    if (type === "acTL") throw new MediaImageError("ANIMATED_IMAGE")
    offset += length + 12
    if (type === "IEND") { ended = true; break }
  }
  if (!ended || offset !== input.length) throw new MediaImageError("IMAGE_INVALID")
}

// 📚 Esta función transforma, pero no publica ni cambia la BD. La entrada
// 📚 temporal pertenece al llamador; solo escribimos en su intento de salida.
export async function processMediaImage(
  inputPath: string, outputDirectory: string, kind: ImageKind,
  onTransforming: (edge: number) => void = () => {},
): Promise<ImageManifest> {
  try {
    const input = await readInput(inputPath)
    const format = input.subarray(0, 8).equals(PNG_SIGNATURE) ? "png"
      : input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff ? "jpeg" : null
    if (!format) throw new MediaImageError("UNSUPPORTED_FORMAT")
    if (format === "png") rejectAnimatedPng(input)
    const options = { limitInputPixels: IMAGE_MAX_PIXELS, failOn: "warning" as const }
    const metadata = await sharp(input, options).metadata()
    if (metadata.format !== format || !metadata.width || !metadata.height) throw new MediaImageError("IMAGE_INVALID")
    if (metadata.width * metadata.height > IMAGE_MAX_PIXELS) throw new MediaImageError("IMAGE_TOO_MANY_PIXELS")
    if ((metadata.pages ?? 1) !== 1) throw new MediaImageError("ANIMATED_IMAGE")
    if (kind === "avatar" && metadata.width !== metadata.height) throw new MediaImageError("AVATAR_CROP_REQUIRED")

    const manifest: ImageManifest = { kind, inputFormat: format, variants: [] }
    const effectiveEdges = new Set<number>()
    for (const edge of IMAGE_EDGES[kind]) {
      const effectiveEdge = Math.min(edge, Math.max(metadata.width, metadata.height))
      if (effectiveEdges.has(effectiveEdge)) continue
      effectiveEdges.add(effectiveEdge)
      const pipeline = sharp(input, options)
        // 📚 Orientar y convertir a sRGB antes de quitar los metadatos conserva
        // 📚 el aspecto correcto. Sharp los elimina por defecto en la salida.
        .autoOrient().toColourspace("srgb")
        .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      if (format === "jpeg") pipeline.jpeg({ quality: 85 })
      else pipeline.png({ palette: false })
      const transforming = pipeline.toBuffer({ resolveWithObject: true })
      onTransforming(edge)
      // 📚 Await dentro del bucle mantiene una variante activa por trabajador:
      // 📚 Promise.all aquí multiplicaría CPU y memoria innecesariamente.
      const { data, info } = await transforming
      const filename = `image-${info.width}x${info.height}.${format === "jpeg" ? "jpg" : "png"}`
      try { await writeFile(join(outputDirectory, filename), data, { flag: "wx", mode: 0o600 }) }
      catch { throw new MediaImageError("OUTPUT_WRITE_FAILED") }
      manifest.variants.push({ filename, width: info.width, height: info.height, bytes: data.length, format })
    }
    return manifest
  } catch (error) {
    if (error instanceof MediaImageError) throw error
    // 📚 Este mensaje procede de Sharp, no de una petición. Nunca reenviamos
    // 📚 su texto: solo clasificamos su rechazo del límite nativo de píxeles.
    if (error instanceof Error && error.message.includes("pixel limit")) throw new MediaImageError("IMAGE_TOO_MANY_PIXELS")
    throw new MediaImageError("IMAGE_INVALID")
  }
}
