import { createHash } from "node:crypto"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { deflateSync } from "node:zlib"
import sharp from "sharp"
import { generateBenchmarkCorpus, padJpegToSize, pngCrc32 } from "../media-benchmark/corpus"

export type CorpusEntry = {
  id: string; filename: string; path: string; bytes: number; sha256: string; features: string[]
  provenance: { kind: "synthetic" | "repository"; source: string; sourceSha256?: string; rights: string }
  expected: { status: number; failureCode?: string; format?: "png" | "jpeg"; width?: number; height?: number; orientation?: number }
  inputMetadata: Record<string, unknown>
}
export const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex")

// 📚 La escena usa geometría y texturas deterministas: conocemos sus esquinas y podemos detectar orientación/recorte sin fiarnos del worker.
function diagnosticScene(width: number, height: number, alpha = false): Buffer {
  const corner = Math.round(Math.min(width, height) * 0.18)
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1600 1200" preserveAspectRatio="none"><defs><linearGradient id="g"><stop stop-color="#182a4a"/><stop offset=".5" stop-color="#a65846"/><stop offset="1" stop-color="#e5c371"/></linearGradient><pattern id="lines" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M0 0L20 20M-10 10L10 30M10 -10L30 10" stroke="#edf1ea" stroke-opacity=".2" stroke-width="1"/></pattern></defs><rect width="1600" height="1200" fill="url(#g)" ${alpha ? 'opacity=".35"' : ''}/><rect x="120" y="150" width="1360" height="900" rx="80" fill="url(#lines)"/><circle cx="800" cy="510" r="280" fill="#e7c676"/><circle cx="800" cy="510" r="230" fill="#273f4f"/><path d="M660 350H940V540Q800 740 660 540ZM800 650V820M680 840H920M660 400H550Q530 630 700 600M940 400H1050Q1070 630 900 600" fill="#e9bd58" stroke="#f4df9b" stroke-width="18"/><text x="800" y="960" text-anchor="middle" font-family="Arial" font-size="64" fill="#fff">LOCKERBOARD 2026</text><text x="800" y="1020" text-anchor="middle" font-family="Arial" font-size="28" fill="#fff">0123456789 · texture / edges / colour</text><g>${Array.from({ length: 40 }, (_, i) => `<path d="M${300 + i * 26} 1100v${i % 3 ? 35 : 60}" stroke="${i % 2 ? '#ed563b' : '#286dad'}" stroke-width="${i % 3 + 1}"/>`).join('')}</g><rect width="${corner * 1600 / width}" height="${corner * 1200 / height}" fill="#dc2828"/><rect x="${1600 - corner * 1600 / width}" width="${corner * 1600 / width}" height="${corner * 1200 / height}" fill="#28b446"/><rect y="${1200 - corner * 1200 / height}" width="${corner * 1600 / width}" height="${corner * 1200 / height}" fill="#2850dc"/><rect x="${1600 - corner * 1600 / width}" y="${1200 - corner * 1200 / height}" width="${corner * 1600 / width}" height="${corner * 1200 / height}" fill="#e6c828"/></svg>`)
}

// 📚 Las longitudes y CRC permiten fabricar casos APNG/PNG dañados con identidad exacta; no se descargan archivos desconocidos.
function chunk(type: string, data: Buffer): Buffer {
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0); result.write(type, 4); data.copy(result, 8)
  result.writeUInt32BE(pngCrc32(result.subarray(4, data.length + 8)), data.length + 8)
  return result
}
function apng(): Buffer {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(2, 0); ihdr.writeUInt32BE(2, 4); ihdr[8] = 8; ihdr[9] = 6
  const actl = Buffer.alloc(8); actl.writeUInt32BE(2)
  const control = (sequence: number) => { const b = Buffer.alloc(26); b.writeUInt32BE(sequence); b.writeUInt32BE(2, 4); b.writeUInt32BE(2, 8); b.writeUInt16BE(1, 20); b.writeUInt16BE(10, 22); return b }
  const pixels = deflateSync(Buffer.from([0, 255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 0, 255, 255, 0, 0, 255, 255]))
  const seq = Buffer.alloc(4); seq.writeUInt32BE(2)
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk("IHDR", ihdr), chunk("acTL", actl), chunk("fcTL", control(0)), chunk("IDAT", pixels), chunk("fcTL", control(1)), chunk("fdAT", Buffer.concat([seq,pixels])), chunk("IEND", Buffer.alloc(0))])
}

// 📚 La procedencia acompaña a cada hash: las fuentes propias se regeneran y el arte del repo se referencia sin alterarlo ni integrarlo en producto.
export async function generateQualityCorpus(directory: string, repository: string, onEntry: (id: string) => void = () => {}): Promise<CorpusEntry[]> {
  sharp.cache(false); sharp.concurrency(1)
  await mkdir(directory, { recursive: true })
  const entries: CorpusEntry[] = []
  const add = async (id: string, bytes: Buffer, features: string[], expected: CorpusEntry["expected"], provenance?: CorpusEntry["provenance"]) => {
    const filename = `${id}.${expected.format === "jpeg" ? "jpg" : expected.format === "png" ? "png" : "bin"}`
    const path = join(directory, filename)
    await writeFile(path, bytes, { flag: "wx" })
    let inputMetadata: Record<string, unknown> = {}
    try {
      const m = await sharp(bytes, { limitInputPixels: false }).metadata()
      inputMetadata = { format: m.format, width: m.width, height: m.height, space: m.space, depth: m.depth, hasAlpha: m.hasAlpha, orientation: m.orientation ?? null, pages: m.pages ?? 1, exif: !!m.exif, xmp: !!m.xmp, icc: !!m.icc, iptc: !!m.iptc }
    } catch { inputMetadata = { readableHeader: false } }
    onEntry(id)
    entries.push({ id, filename, path, bytes: bytes.length, sha256: sha256(bytes), features, expected, inputMetadata, provenance: provenance ?? { kind: "synthetic", source: `media-quality/corpus.ts#${id}`, rights: "Fixture propia creada por código para este proyecto; sin personas reales ni descargas." } })
  }
  for (const [id, width, height, format] of [
    ["landscape-detail", 2400, 1600, "jpeg"], ["portrait-detail", 1600, 2400, "jpeg"],
    ["square-alpha", 1600, 1600, "png"], ["odd-dimensions", 1921, 1081, "jpeg"],
  ] as const) {
    const encoder = sharp(diagnosticScene(width, height, format === "png"))
    const bytes = await (format === "jpeg" ? encoder.jpeg({ quality: 97, chromaSubsampling: "4:4:4" }) : encoder.png()).toBuffer()
    await add(id, bytes, ["composition", "fine-detail", "colour", ...(format === "png" ? ["alpha"] : [])], { status: 202, format, width, height })
  }
  // 📚 Xorshift con semilla fija produce alta entropía real, sin padding: permite medir PNG detallados que se acercan al máximo por contenido.
  const texture = Buffer.alloc(1600 * 1200 * 4)
  let seed = 0x4c425141
  for (let i = 0; i < texture.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; texture[i] = i % 4 === 3 ? 80 + (seed >>> 0) % 176 : seed & 255 }
  await add("high-entropy-alpha", await sharp(texture, { raw: { width: 1600, height: 1200, channels: 4 } }).png().toBuffer(), ["high-entropy", "alpha", "no-padding"], { status: 202, format: "png", width: 1600, height: 1200 })
  const sourceRelative = "apps/frontend/LockerBoard-marca/otros/hero/final/lockerboard-hero-mural-landscape-2560x1440.png"
  const ownArt = await readFile(join(repository, sourceRelative))
  await add("repository-dark-texture", await sharp(ownArt).jpeg({ quality: 97, chromaSubsampling: "4:4:4" }).toBuffer(), ["repository-art", "dark-texture", "photo-like", "shadow-detail"], { status: 202, format: "jpeg", width: 2560, height: 1440 }, { kind: "repository", source: sourceRelative, sourceSha256: sha256(ownArt), rights: "Arte existente aportado en el repositorio del usuario; uso autorizado por la tarea como fixture local. No se obtiene fotografía personal externa." })
  const oriented = await sharp(diagnosticScene(1200, 800)).jpeg({ quality: 97, chromaSubsampling: "4:4:4" }).toBuffer()
  for (let orientation = 1; orientation <= 8; orientation++) {
    const bytes = await sharp(oriented).withMetadata({ orientation }).withExif({ IFD0: { Artist: "Synthetic QA author", ImageDescription: "Synthetic metadata, not personal data" } }).withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description test="synthetic-private-tag"/></rdf:RDF></x:xmpmeta>').jpeg({ quality: 97, chromaSubsampling: "4:4:4" }).toBuffer()
    await add(`exif-${orientation}`, bytes, ["orientation", "exif", "xmp", "icc", "corner-oracle"], { status: 202, format: "jpeg", width: orientation >= 5 ? 800 : 1200, height: orientation >= 5 ? 1200 : 800, orientation })
  }
  await add("display-p3", await sharp(diagnosticScene(1600, 1200)).withIccProfile("p3").png().toBuffer(), ["colour-profile", "display-p3"], { status: 202, format: "png", width: 1600, height: 1200 })
  await add("cmyk-jpeg", await sharp(diagnosticScene(1600, 1200)).withIccProfile("cmyk").jpeg({ quality: 97 }).toBuffer(), ["colour-profile", "cmyk"], { status: 202, format: "jpeg", width: 1600, height: 1200 })
  await add("grayscale-progressive", await sharp(diagnosticScene(1600, 1200)).toColourspace("b-w").jpeg({ progressive: true, quality: 97 }).toBuffer(), ["grayscale", "progressive"], { status: 202, format: "jpeg", width: 1600, height: 1200 })
  await add("png-16bit", await sharp(diagnosticScene(1600, 1200)).toColourspace("rgb16").png().toBuffer(), ["16-bit", "colour"], { status: 202, format: "png", width: 1600, height: 1200 })
  await add("palette-alpha", await sharp(diagnosticScene(900, 900, true)).png({ palette: true, colours: 128 }).toBuffer(), ["palette-input", "alpha"], { status: 202, format: "png", width: 900, height: 900 })
  for (const [id, width, height] of [["small-png", 96, 64], ["single-pixel", 1, 1], ["thin-panorama", 24000, 1], ["thin-portrait", 1, 24000]] as const) {
    const bytes = await sharp({ create: { width, height, channels: 4, background: { r: 40, g: 80, b: 160, alpha: 0.5 } } }).png().toBuffer()
    await add(id, bytes, ["no-enlargement", "aspect-ratio"], { status: 202, format: "png", width, height })
  }
  const maximum = await generateBenchmarkCorpus(join(directory, "boundary"))
  for (const entry of maximum) await add(`boundary-${entry.name}`, await readFile(entry.path), ["24MP", "exact-10MB", `legal-padding:${entry.paddingBytes}`], { status: 202, format: entry.format, width: entry.width, height: entry.height })
  const base = await sharp(diagnosticScene(640, 480)).jpeg({ quality: 97 }).toBuffer()
  await add("too-many-bytes", padJpegToSize(base, 10_000_001).data, ["over-10MB-by-one"], { status: 413 })
  await add("too-many-pixels", await sharp({ create: { width: 6000, height: 4001, channels: 3, background: "#775533" } }).jpeg().toBuffer(), ["over-24MP"], { status: 202, failureCode: "IMAGE_TOO_MANY_PIXELS" })
  await add("animated-png", apng(), ["APNG-two-frames"], { status: 202, failureCode: "ANIMATED_IMAGE" })
  await add("truncated-jpeg", base.subarray(0, base.length - 150), ["truncated"], { status: 202, failureCode: "IMAGE_INVALID" })
  const png = await sharp(diagnosticScene(640, 480)).png().toBuffer()
  await add("truncated-png", png.subarray(0, 32), ["truncated"], { status: 202, failureCode: "IMAGE_INVALID" })
  await add("png-trailing-data", Buffer.concat([png, Buffer.from("invalid trailing data")]), ["trailing-data"], { status: 202, failureCode: "IMAGE_INVALID" })
  const badCrc = Buffer.from(png); badCrc[badCrc.length - 17] ^= 0xff
  await add("corrupt-png", badCrc, ["corrupt-crc-or-data"], { status: 202, failureCode: "IMAGE_INVALID" })
  for (const format of ["webp", "gif", "tiff"] as const) await add(`unsupported-${format}`, await sharp(diagnosticScene(80, 60)).toFormat(format).toBuffer(), ["wrong-format", "misleading-filename"], { status: 415 })
  await add("unsupported-svg", diagnosticScene(80, 60), ["wrong-format", "misleading-filename"], { status: 415 })
  await add("garbage", Buffer.from("not an image"), ["invalid-content"], { status: 415 })
  await add("empty", Buffer.alloc(0), ["empty"], { status: 415 })
  return entries
}

// 📚 El manifiesto público conserva recetas/hashes y rutas relativas, nunca el workspace temporal de la máquina.
export function publicCorpus(entries: CorpusEntry[]) {
  return entries.map(({ path, ...entry }) => ({ ...entry, recipe: relative(__dirname, __filename).replace(/\\/g, "/") }))
}
