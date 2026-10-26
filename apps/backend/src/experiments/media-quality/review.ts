import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import sharp, { type OverlayOptions } from "sharp"

// 📚 Los formatos muy bajos/estrechos también son válidos: acotamos la región por ambos bordes antes de pedir extract a libvips.
export function reviewCrop(width: number, height: number) {
  const cropWidth = Math.min(180, width), cropHeight = Math.min(180, height)
  return { left: Math.min(width - cropWidth, Math.max(0, Math.floor(width * .5 - cropWidth / 2))), top: Math.min(height - cropHeight, Math.max(0, Math.floor(height * .65 - cropHeight / 2))), width: cropWidth, height: cropHeight }
}

// 📚 Los paneles conservan escala de píxel 1x/2x, con referencia y salida separadas: no son screenshots ni QA del frontal.
export async function makeReviewPanel(reference: Buffer, actual: Buffer, directory: string, id: string, variant: string): Promise<string> {
  const meta = await sharp(actual).metadata(); const width = meta.width!, height = meta.height!
  const region = reviewCrop(width, height)
  const cropWidth = region.width, cropHeight = region.height
  const overlays: OverlayOptions[] = []
  const header = Buffer.from(`<svg width="1040" height="1000"><rect width="1040" height="1000" fill="#e9ecef"/><g font-family="Arial" fill="#182431"><text x="24" y="35" font-size="22">${id} / ${variant} / ${width} x ${height}</text><text x="24" y="74" font-size="17">Referencia sin compresion final</text><text x="536" y="74" font-size="17">Salida productiva</text><text x="24" y="366" font-size="17">Recorte a 1x (un pixel de imagen = un pixel de panel)</text><text x="24" y="606" font-size="17">Mismo recorte a 2x, vecino mas cercano</text></g></svg>`)
  overlays.push({ input: header, left: 0, top: 0 })
  for (const [index, input] of [reference, actual].entries()) {
    const left = index ? 536 : 24
    const overview = await sharp(input).resize({ width: 480, height: 250, fit: "contain", background: "#636970" }).png().toBuffer()
    const one = await sharp(input).extract(region).flatten({ background: "#636970" }).png().toBuffer()
    const two = await sharp(one).resize(cropWidth * 2, cropHeight * 2, { kernel: "nearest" }).png().toBuffer()
    overlays.push({ input: overview, left, top: 90 }, { input: one, left, top: 390 }, { input: two, left, top: 625 })
  }
  const filename = `${id}-${variant}-review.png`
  await writeFile(join(directory, filename), await sharp({ create: { width: 1040, height: 1000, channels: 3, background: "white" } }).composite(overlays).png().toBuffer())
  return filename
}
