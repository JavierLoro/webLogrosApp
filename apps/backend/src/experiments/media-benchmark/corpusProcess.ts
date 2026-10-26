import { generateBenchmarkCorpus } from "./corpus"
import sharp from "sharp"

// El generador termina antes de medir: sus buffers y CPU no pertenecen al backend.
process.once("message", (message: { directory: string }) => {
  void generateBenchmarkCorpus(message.directory).then((entries) => {
    process.send?.({ entries, versions: sharp.versions }, () => process.disconnect?.())
  }).catch(() => { process.send?.({ error: "CORPUS_GENERATION_FAILED" }, () => process.disconnect?.()); process.exitCode = 1 })
})
