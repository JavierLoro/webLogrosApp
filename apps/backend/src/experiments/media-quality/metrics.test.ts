import assert from "node:assert/strict"
import { test } from "node:test"
import { reviewCrop } from "./review"
import sharp from "sharp"
import { mkdtemp, writeFile, readFile, mkdir, realpath, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { processMediaImage } from "../../lib/mediaImageProcessing"
import { comparePixels, expectedCorners, makeLosslessReference } from "./metrics"

// 📚 Verificamos las métricas con errores conocidos: un error en la herramienta de QA no debe convertir salidas dañadas en PASS.
test("métricas idénticas, diferencia RGB conocida y error alpha", () => {
  const pixels = Buffer.from([100,100,100,255,100,100,100,128])
  assert.deepEqual(comparePixels(pixels, pixels, 2, 1), { exactPixels: true, meanAbsoluteError: 0, psnrDb: null, ssimLuma: 1, alphaMaxError: 0 })
  const changed = Buffer.from([110,110,110,255,110,110,110,128])
  const measured = comparePixels(pixels, changed, 2, 1)
  assert.equal(measured.meanAbsoluteError, 10); assert.ok(Math.abs(measured.psnrDb! - 28.1308036087) < 1e-8)
  assert.ok(measured.ssimLuma < 1 && measured.ssimLuma > 0)
  const alpha = Buffer.from(pixels); alpha[3] = 0
  assert.equal(comparePixels(pixels, alpha, 2, 1).alphaMaxError, 255)
  assert.equal(comparePixels(pixels, alpha, 2, 1).exactPixels, false)
})
test("métricas detectan contraste perdido y dimensiones inválidas", () => {
  const black = Buffer.alloc(8 * 8 * 4), white = Buffer.alloc(8 * 8 * 4, 255)
  const measured = comparePixels(black, white, 8, 8)
  assert.equal(measured.psnrDb, 0); assert.ok(measured.ssimLuma < .001)
  assert.throws(() => comparePixels(black, white, 9, 8))
})
test("oráculo EXIF incluye las ocho permutaciones y las reflexiones", () => {
  assert.equal(new Set(Array.from({ length: 8 }, (_, i) => JSON.stringify(expectedCorners(i + 1)))).size, 8)
  assert.deepEqual(expectedCorners(5)[1], [40,80,220]); assert.deepEqual(expectedCorners(7)[0], [230,200,40])
  assert.throws(() => expectedCorners(0))
})

test("paneles de revisión acotan recortes en panoramas, retratos y fuentes pequeñas", () => {
  for (const [width,height] of [[320,213],[213,320],[1,1280],[1280,1],[1,1],[96,64]]) {
    const region = reviewCrop(width,height)
    assert.ok(region.left >= 0 && region.top >= 0)
    assert.ok(region.left + region.width <= width && region.top + region.height <= height)
  }
  assert.equal(reviewCrop(320,213).top,33)
})

test("referencia PNG conserva el muestreo proporcional con dimensiones redondeadas", async () => {
  const base = await realpath(tmpdir()), root = await realpath(await mkdtemp(join(base, "media-quality-reference-")))
  const source = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1001" height="667"><defs><linearGradient id="g"><stop stop-color="red"/><stop offset="1" stop-color="blue"/></linearGradient></defs><rect width="1001" height="667" fill="url(#g)"/><circle cx="501" cy="330" r="180" fill="yellow" opacity=".6"/></svg>')).png().toBuffer()
  const input = join(root,"input.png"), output = join(root,"output")
  try {
    await writeFile(input,source);await mkdir(output)
    const processed = await processMediaImage(input,output,"achievement")
    for (const [index,variant] of processed.variants.entries()) {
      const reference = await makeLosslessReference(source,[1280,640,320][index])
      const actual = await readFile(join(output,variant.filename))
      const a = await sharp(reference).ensureAlpha().raw().toBuffer(), b = await sharp(actual).ensureAlpha().raw().toBuffer()
      assert.equal(comparePixels(a,b,variant.width,variant.height).exactPixels,true)
    }
  } finally {
    assert.equal(dirname(root),base);assert.ok(root.startsWith(join(base,"media-quality-reference-")));assert.equal(await realpath(root),root)
    await rm(root,{recursive:true})
  }
})
