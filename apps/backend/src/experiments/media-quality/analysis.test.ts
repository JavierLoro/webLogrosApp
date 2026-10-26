import assert from "node:assert/strict"
import { test } from "node:test"
import { summarizeQuality, type QualityCaseResult } from "./analysis"

// 📚 Un resumen vacío/incompleto no demuestra calidad, y una mediana par necesita las dos muestras centrales.
test("resumen no inventa aprobaciones ni precisión PNG con corpus vacío", () => {
  const summary = summarizeQuality([])
  assert.equal(summary.processed,0); assert.equal(summary.allPngPixelsExact,false); assert.equal(summary.jpegMinPsnrDb,null)
  assert.deepEqual(summary.bytesPerImage,{min:null,median:null,p95:null,max:null})
})
test("pesos suman variantes y calculan mediana par y p95 por rango", () => {
  const fixture = (id: string, bytes: number): QualityCaseResult => ({ id, expected:{status:202,format:"png"},outcome:"PASS_PROCESSED",alerts:[],panels:[],variants:[{filename:`${id}.png`,width:1,height:1,bytes,sha256:"test",privateReadVerified:true,metrics:{exactPixels:true,meanAbsoluteError:0,psnrDb:null,ssimLuma:1,alphaMaxError:0}}] })
  const summary = summarizeQuality([fixture("one",4),fixture("two",8)])
  assert.deepEqual(summary.bytesPerImage,{min:4,median:6,p95:8,max:8});assert.equal(summary.totalVariantBytes,12);assert.equal(summary.allPngPixelsExact,true)
})
