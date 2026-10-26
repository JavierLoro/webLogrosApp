import { z } from "zod"

// 📚 Los códigos describen fallos seguros del transporte; no incluyen rutas ni mensajes del sistema.
const uploadErrors = {
  INVALID_UPLOAD_INPUT: { statusCode: 400, message: "La petición de imagen no es válida" },
  INVALID_MULTIPART: { statusCode: 400, message: "El formulario de imagen está incompleto o no es válido" },
  FILE_REQUIRED: { statusCode: 400, message: "Falta el archivo de imagen" },
  UNEXPECTED_FILE_FIELD: { statusCode: 400, message: "El formulario contiene un archivo inesperado" },
  UNEXPECTED_TEXT_FIELD: { statusCode: 400, message: "El formulario contiene un campo inesperado" },
  TOO_MANY_FILES: { statusCode: 400, message: "El formulario contiene demasiados archivos" },
  FILE_TOO_LARGE: { statusCode: 413, message: "La imagen supera los 10 MB" },
  UNSUPPORTED_FORMAT: { statusCode: 415, message: "Solo se admiten PNG y JPEG" },
  UPLOAD_ABORTED: { statusCode: 400, message: "Se canceló la recepción de la imagen" },
  UPLOAD_INTERRUPTED: { statusCode: 400, message: "La recepción de la imagen se interrumpió" },
  WORKSPACE_EXISTS: { statusCode: 409, message: "El espacio temporal del trabajo ya existe" },
  INVALID_WORKSPACE: { statusCode: 500, message: "El espacio temporal no es válido" },
  TEMPORARY_STORAGE_FAILED: { statusCode: 500, message: "No se pudo guardar la imagen temporalmente" },
} as const

export const mediaUploadErrorCodeSchema = z.enum(Object.keys(uploadErrors) as [MediaUploadErrorCode, ...MediaUploadErrorCode[]])
export type MediaUploadErrorCode = keyof typeof uploadErrors

// 📚 Un error tipado separa respuesta pública segura de detalles privados del filesystem.
export class MediaUploadError extends Error {
  cleanupPendingDirectory?: string

  constructor(public readonly code: MediaUploadErrorCode) {
    super(uploadErrors[code].message)
    this.name = "MediaUploadError"
  }

  get statusCode(): number {
    return uploadErrors[this.code].statusCode
  }
}

// 📚 La validación de runtime cubre llamadores JavaScript o datos que eludan TypeScript.
export const mediaUploadOptionsSchema = z.object({
  temporaryRoot: z.string().min(1),
  jobId: z.string().uuid(),
  signal: z.custom<AbortSignal>((value) => value instanceof AbortSignal).optional(),
  ownership: z.object({ runtimeOwnerId: z.string().uuid(), receiptToken: z.string().uuid() }).strict().optional(),
}).strict()

export const multipartContentTypeSchema = z.string().regex(/^multipart\/form-data\s*;/i)
