import sharp from "sharp"
import { processMediaImage } from "./mediaImageProcessing"
import { imageWorkerRequestSchema, MediaImageError } from "./mediaImageProtocol"

// 📚 Se configuran en el proceso hijo: Express no carga Sharp para ejecutar.
// 📚 Cada trabajador vive una imagen. Desactivar la caché de operaciones evita
// 📚 retener recursos del decodificador entre variantes, sobre todo en JPEG
// 📚 progresivo. No establece un límite de RAM ni cambia la calidad de salida.
sharp.concurrency(1)
sharp.cache(false)

// 📚 Si desaparece el padre, detenemos este trabajador y sus hilos nativos.
// 📚 La limpieza de restos tras reinicios pertenecerá al ciclo durable del job.
process.on("disconnect", () => process.exit(1))
if (!process.send) process.exit(1)
process.once("message", async (raw) => {
  const parsed = imageWorkerRequestSchema.safeParse(raw)
  if (!parsed.success) {
    process.send!({ type: "failed", code: "WORKER_FAILED" }, () => process.exit(1))
    return
  }
  process.send!({ type: "started" })
  try {
    const { inputPath, outputDirectory, kind } = parsed.data
    const manifest = await processMediaImage(inputPath, outputDirectory, kind,
      (edge) => process.send!({ type: "transforming", edge }))
    // 📚 El callback confirma envío por IPC antes de salir. La imagen permanece
    // 📚 en disco; el padre recibe solo el manifiesto y después confirma el cierre.
    process.send!({ type: "processed", manifest }, () => process.exit(0))
  } catch (error) {
    const code = error instanceof MediaImageError ? error.code : "WORKER_FAILED"
    process.send!({ type: "failed", code }, () => process.exit(1))
  }
})
process.send!({ type: "ready" })
