import type { CorpusEntry } from "./corpus"
import type { PixelMetrics } from "./metrics"

export type QualityCaseResult = {
  id: string; expected: CorpusEntry["expected"]; outcome: "RUNNING" | "PASS_PROCESSED" | "PASS_REJECTED"
  variants: Array<{ filename: string; width: number; height: number; bytes: number; sha256: string; metrics: PixelMetrics; privateReadVerified: boolean }>
  panels: string[]; alerts: Array<{ variant: number; reason: string }>
  httpStatus?: number; jobStatus?: string; failureCode?: string | null; productFlow?: string
}

// 📚 La mediana interpola las dos posiciones centrales y p95 usa rango más próximo; el informe declara el método para no confundir muestras con capacidad máxima.
function distribution(values: number[]) {
  const sorted = [...values].sort((a,b) => a - b), n = sorted.length
  if (!n) return { min: null, median: null, p95: null, max: null }
  return { min: sorted[0], median: n % 2 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2, p95: sorted[Math.ceil(n * .95) - 1], max: sorted[n - 1] }
}

// 📚 Se deriva siempre del reporte bruto: reejecutar el experimento produce el mismo resumen sin cálculos manuales ni contar casos incompletos como aprobados.
export function summarizeQuality(results: QualityCaseResult[]) {
  const processed = results.filter(r => r.outcome === "PASS_PROCESSED")
  const variants = processed.flatMap(r => r.variants)
  const png = variants.filter(v => v.filename.endsWith(".png")), jpeg = variants.filter(v => v.filename.endsWith(".jpg"))
  const weights = processed.map(r => ({ id: r.id, format: r.expected.format!, bytes: r.variants.reduce((n,v) => n + v.bytes, 0) })).sort((a,b) => a.bytes - b.bytes)
  const psnr = jpeg.map(v => v.metrics.psnrDb).filter((v): v is number => v !== null)
  return {
    cases: results.length, processed: processed.length, rejected: results.filter(r => r.outcome === "PASS_REJECTED").length,
    variants: variants.length, pngVariants: png.length, jpegVariants: jpeg.length,
    allPngPixelsExact: png.length > 0 && png.every(v => v.metrics.exactPixels),
    jpegMinPsnrDb: psnr.length ? Math.min(...psnr) : null, jpegMinSsimLuma: jpeg.length ? Math.min(...jpeg.map(v => v.metrics.ssimLuma)) : null,
    metricWarnings: results.reduce((n,r) => n + r.alerts.length, 0), totalVariantBytes: variants.reduce((n,v) => n + v.bytes, 0),
    statisticMethod: "median interpolates the middle pair; p95 nearest-rank; bytes include all variants per image",
    bytesPerImage: distribution(weights.map(v => v.bytes)), bytesPerFormat: { png: distribution(weights.filter(v => v.format === "png").map(v => v.bytes)), jpeg: distribution(weights.filter(v => v.format === "jpeg").map(v => v.bytes)) },
    weights, panels: results.reduce((n,r) => n + r.panels.length, 0),
  }
}
