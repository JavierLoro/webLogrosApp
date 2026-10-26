import { z } from "zod"

// 📚 Este contrato interno une al controlador y al trabajador. No es un endpoint:
// 📚 las rutas privadas y los mensajes IPC nunca se entregan al navegador.
export const IMAGE_MAX_BYTES = 10_000_000
export const IMAGE_MAX_PIXELS = 24_000_000
export const IMAGE_PROCESSING_TIMEOUT_MS = 30_000
export const IMAGE_EDGES = { achievement: [1280, 640, 320], logo: [512, 128], avatar: [256, 96] } as const
export const imageKindSchema = z.enum(["achievement", "logo", "avatar"])
export type ImageKind = z.infer<typeof imageKindSchema>

const messages = {
  INVALID_WORKSPACE: "El directorio temporal no es válido",
  IMAGE_TOO_LARGE: "La imagen supera los 10 MB",
  IMAGE_TOO_MANY_PIXELS: "La imagen supera los 24 millones de píxeles",
  IMAGE_INVALID: "No se puede leer esta imagen",
  UNSUPPORTED_FORMAT: "Solo se admiten PNG y JPEG",
  ANIMATED_IMAGE: "La imagen debe ser estática",
  AVATAR_CROP_REQUIRED: "El avatar necesita el encuadre cuadrado elegido por el usuario",
  OUTPUT_WRITE_FAILED: "No se pudieron guardar las variantes temporales",
  WORKER_FAILED: "El proceso de imagen terminó sin un resultado válido",
  WORKER_START_TIMEOUT: "El proceso de imagen no pudo arrancar a tiempo",
  PROCESSING_TIMEOUT: "La imagen superó el tiempo de procesamiento",
  CANCELED: "Se canceló el procesamiento de la imagen",
} as const
export type ImageErrorCode = keyof typeof messages
export const imageErrorCodeSchema = z.enum(Object.keys(messages) as [ImageErrorCode, ...ImageErrorCode[]])

// 📚 El código permite decidir qué hacer sin interpretar texto de Sharp. Los
// 📚 detalles nativos no se convierten en mensajes públicos ni se envían por IPC.
export class MediaImageError extends Error {
  cleanupPendingDirectory?: string
  constructor(public readonly code: ImageErrorCode) {
    super(messages[code])
    this.name = "MediaImageError"
  }
}

export const imageVariantSchema = z.object({
  filename: z.string().regex(/^image-[1-9]\d*x[1-9]\d*\.(jpg|png)$/),
  width: z.number().int().positive().max(1280),
  height: z.number().int().positive().max(1280),
  bytes: z.number().int().positive(),
  format: z.enum(["jpeg", "png"]),
}).strict()
export type ImageVariant = z.infer<typeof imageVariantSchema>
export const imageManifestSchema = z.object({
  kind: imageKindSchema,
  inputFormat: z.enum(["jpeg", "png"]),
  variants: z.array(imageVariantSchema).min(1).max(3),
}).strict()
export type ImageManifest = z.infer<typeof imageManifestSchema>
export const imageWorkerRequestSchema = z.object({
  kind: imageKindSchema,
  inputPath: z.string().min(1),
  outputDirectory: z.string().min(1),
}).strict()
export const imageWorkerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }).strict(),
  z.object({ type: z.literal("started") }).strict(),
  z.object({ type: z.literal("transforming"), edge: z.number().int().positive().max(1280) }).strict(),
  z.object({ type: z.literal("processed"), manifest: imageManifestSchema }).strict(),
  z.object({ type: z.literal("failed"), code: imageErrorCodeSchema }).strict(),
])
