import assert from "node:assert/strict"
import sharp from "sharp"

export type PixelMetrics = { exactPixels: boolean; meanAbsoluteError: number; psnrDb: number | null; ssimLuma: number; alphaMaxError: number }

// 📚 Se compara contra píxeles sin compresión final: PSNR mide error global y SSIM por bloques hace visibles pérdidas de estructura local.
export function comparePixels(reference: Buffer, actual: Buffer, width: number, height: number): PixelMetrics {
  assert.equal(reference.length, width * height * 4); assert.equal(actual.length, reference.length)
  let absolute = 0, squared = 0, alphaMaxError = 0
  const lumaReference = new Float64Array(width * height), lumaActual = new Float64Array(width * height)
  for (let pixel = 0; pixel < width * height; pixel++) {
    const at = pixel * 4
    for (let channel = 0; channel < 3; channel++) { const delta = reference[at + channel] - actual[at + channel]; absolute += Math.abs(delta); squared += delta * delta }
    alphaMaxError = Math.max(alphaMaxError, Math.abs(reference[at + 3] - actual[at + 3]))
    lumaReference[pixel] = 0.2126 * reference[at] + 0.7152 * reference[at + 1] + 0.0722 * reference[at + 2]
    lumaActual[pixel] = 0.2126 * actual[at] + 0.7152 * actual[at + 1] + 0.0722 * actual[at + 2]
  }
  const c1 = (0.01 * 255) ** 2, c2 = (0.03 * 255) ** 2
  let ssim = 0, blocks = 0
  for (let top = 0; top < height; top += 8) for (let left = 0; left < width; left += 8) {
    let sumX = 0, sumY = 0, xx = 0, yy = 0, xy = 0, count = 0
    for (let y = top; y < Math.min(top + 8, height); y++) for (let x = left; x < Math.min(left + 8, width); x++) {
      const a = lumaReference[y * width + x], b = lumaActual[y * width + x]
      sumX += a; sumY += b; xx += a * a; yy += b * b; xy += a * b; count++
    }
    const meanX = sumX / count, meanY = sumY / count
    const varX = Math.max(0, xx / count - meanX ** 2), varY = Math.max(0, yy / count - meanY ** 2), covariance = xy / count - meanX * meanY
    ssim += ((2 * meanX * meanY + c1) * (2 * covariance + c2)) / ((meanX ** 2 + meanY ** 2 + c1) * (varX + varY + c2)); blocks++
  }
  const channels = width * height * 3
  return { exactPixels: squared === 0 && alphaMaxError === 0, meanAbsoluteError: absolute / channels, psnrDb: squared === 0 ? null : 10 * Math.log10(255 ** 2 / (squared / channels)), ssimLuma: Math.min(1, Math.max(-1, ssim / blocks)), alphaMaxError }
}

// 📚 El oráculo de esquinas es independiente de autoOrient: cada fila indica la permutación EXIF exigida, incluida la reflexión.
export function expectedCorners(orientation: number): number[][] {
  const colours = [[220, 40, 40], [40, 180, 70], [40, 80, 220], [230, 200, 40]]
  const indexes = [[0,1,2,3], [1,0,3,2], [3,2,1,0], [2,3,0,1], [0,2,1,3], [2,0,3,1], [3,1,2,0], [1,3,0,2]]
  assert.ok(orientation >= 1 && orientation <= 8)
  return indexes[orientation - 1].map(index => colours[index])
}
export function assertOrientedCorners(raw: Buffer, width: number, height: number, orientation: number): void {
  const points = [[.04,.04],[.96,.04],[.04,.96],[.96,.96]]
  const expected = expectedCorners(orientation)
  for (const [index, [x,y]] of points.entries()) {
    const at = (Math.min(height - 1, Math.floor(y * height)) * width + Math.min(width - 1, Math.floor(x * width))) * 4
    for (let channel = 0; channel < 3; channel++) assert.ok(Math.abs(raw[at + channel] - expected[index][channel]) <= 14, `EXIF ${orientation} esquina ${index} canal ${channel}: ${raw[at + channel]} vs ${expected[index][channel]}`)
  }
}

// 📚 Redimensionar por lado máximo mantiene el mismo muestreo proporcional; forzar ancho/alto redondeados con fill introduciría otro error ajeno a la compresión.
export function makeLosslessReference(input: Buffer, edge: number): Promise<Buffer> {
  return sharp(input, { limitInputPixels: 24_000_000 }).autoOrient().toColourspace("srgb")
    .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true }).png({ palette: false }).toBuffer()
}
