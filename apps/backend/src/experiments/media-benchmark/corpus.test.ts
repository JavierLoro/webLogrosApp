import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import sharp from "sharp"
import { generateBenchmarkCorpus, padJpegToSize, padPngToSize, pngCrc32 } from "./corpus"

function pngChunkOffsets(input: Buffer): { type: string; offset: number; next: number }[] {
  const chunks = []
  let offset = 8
  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset)
    const type = input.toString("ascii", offset + 4, offset + 8)
    chunks.push({ type, offset, next: offset + length + 12 })
    offset += length + 12
  }
  return chunks
}

test("CRC32 sigue el checksum estándar usado por PNG", () => {
  assert.equal(pngCrc32(Buffer.from("123456789", "ascii")), 0xcbf43926)
})

test("padding PNG crea un tEXt válido y conserva la decodificación", async () => {
  const original = await sharp({ create: { width: 24, height: 16, channels: 4, background: { r: 40, g: 90, b: 180, alpha: 0.4 } } }).png().toBuffer()
  const { data, paddingBytes } = padPngToSize(original, 4096)
  assert.equal(data.length, 4096)
  assert.equal(paddingBytes, 4096 - original.length)
  const chunks = pngChunkOffsets(data)
  const padding = chunks.find(({ type }) => type === "tEXt")!
  const body = data.subarray(padding.offset + 4, padding.next - 4)
  assert.equal(data.readUInt32BE(padding.next - 4), pngCrc32(body))
  assert.ok(chunks.findIndex(({ type }) => type === "tEXt") < chunks.findIndex(({ type }) => type === "IEND"))
  assert.equal((await sharp(data).metadata()).width, 24)
  assert.equal((await sharp(data).resize(4, 4).raw().toBuffer()).length, 4 * 4 * 4)
})

test("padding JPEG usa segmentos COM de longitud legal antes del escaneo", async () => {
  const original = await sharp({ create: { width: 24, height: 16, channels: 3, background: "#6688aa" } }).jpeg().toBuffer()
  const { data, paddingBytes } = padJpegToSize(original, 5000)
  assert.equal(data.length, 5000)
  assert.equal(paddingBytes, 5000 - original.length)
  let offset = 2
  let comments = 0
  while (offset < data.length) {
    assert.equal(data[offset], 0xff)
    while (data[offset] === 0xff) offset++
    const marker = data[offset++]
    if (marker === 0xda) break
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue
    const length = data.readUInt16BE(offset)
    assert.ok(length <= 65_535)
    if (marker === 0xfe) comments++
    offset += length
  }
  assert.ok(comments > 0)
  assert.ok(offset < data.length)
  assert.equal((await sharp(data).resize(4, 4).raw().toBuffer()).length, 4 * 4 * 3)
})

test("corpus completo opcional: tamaño, hash reproducible, metadata y alpha", { skip: process.env.RUN_MEDIA_BENCHMARK_CORPUS !== "1" }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "media-benchmark-"))
  try {
    const entries = await generateBenchmarkCorpus(directory)
    assert.deepEqual(entries.map(({ name, bytes, width, height }) => ({ name, bytes, width, height })), [
      { name: "jpeg-textured", bytes: 10_000_000, width: 6000, height: 4000 },
      { name: "png-transparent", bytes: 10_000_000, width: 6000, height: 4000 },
    ])
    for (const entry of entries) {
      assert.match(entry.sha256, /^[a-f0-9]{64}$/)
      assert.equal((await readFile(entry.path)).length, entry.bytes)
      assert.ok(entry.paddingBytes > 0)
      assert.equal((await sharp(entry.path).metadata()).format, entry.format)
    }
    assert.equal((await sharp(entries[1].path).metadata()).hasAlpha, true)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
