import "dotenv/config"
import { isAbsolute } from "node:path"
import { z } from "zod"
import { objectStoreConfigFromEnv, type ObjectStoreConfig } from "./objectStoreEnv"

export const MEDIA_TEMP_ROOT_MAX_BYTES = 1_073_741_824
export const MEDIA_MIN_FREE_BYTES = 1_073_741_824
// 📚 Este margen provisional reserva 12 trabajos × entrada máxima + variantes máximas;
// 📚 no es una medida del corpus real ni una cuota de almacenamiento permanente.
export const MEDIA_MAX_IN_FLIGHT_BYTES = 12 * (10_000_000 + 20_000_000)
export const MEDIA_POLL_INTERVAL_MS = 500

export type MediaRuntimeEnv = {
  enabled: boolean
  temporaryRoot?: string
  allowedOrigins: string[]
  objectStore?: ObjectStoreConfig
}

// 📚 Solo se permiten origins, no rutas de página; el router compara Origin exacto.
const originSchema = z.string().url().refine((value) => {
  try {
    const parsed = new URL(value)
    return (parsed.protocol === "http:" || parsed.protocol === "https:")
      && parsed.origin === value
      && !parsed.username
      && !parsed.password
  } catch {
    return false
  }
}, "Debe ser un origin HTTP(S) sin ruta ni credenciales")

// 📚 Media es opcional en V1: al no habilitarse, el backend legado no necesita
// 📚 secretos S3 ni un directorio temporal para poder arrancar.
export function mediaRuntimeEnvFromProcess(env: NodeJS.ProcessEnv = process.env): MediaRuntimeEnv {
  const enabledValue = env.MEDIA_ENABLED?.trim() ?? "false"
  if (enabledValue !== "true" && enabledValue !== "false") {
    throw new Error("MEDIA_ENABLED debe ser true o false")
  }
  if (enabledValue === "false") return { enabled: false, allowedOrigins: [] }

  const temporaryRoot = env.MEDIA_TEMP_ROOT?.trim()
  if (!temporaryRoot) throw new Error("Falta MEDIA_TEMP_ROOT para habilitar imágenes")
  if (!isAbsolute(temporaryRoot)) throw new Error("MEDIA_TEMP_ROOT debe ser una ruta absoluta")

  const allowedOrigins = mediaAllowedOriginsFromProcess(env)

  // 📚 La configuración S3 solo se lee en el modo activo; las variables con
  // 📚 credenciales no son requisito para el arranque legacy ni se registran.
  return {
    enabled: true,
    temporaryRoot,
    allowedOrigins,
    objectStore: objectStoreConfigFromEnv(),
  }
}

// 📚 Guardar texto sigue necesitando protección de origen aunque el procesamiento esté desactivado; no exige credenciales S3.
export function mediaAllowedOriginsFromProcess(env: NodeJS.ProcessEnv = process.env): string[] {
  const rawOrigins = env.MEDIA_ALLOWED_ORIGINS?.trim()
  let allowedOrigins: string[]
  if (!rawOrigins) {
    if (env.NODE_ENV === "production") {
      throw new Error("MEDIA_ALLOWED_ORIGINS es obligatorio en producción")
    }
    allowedOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"]
  } else {
    allowedOrigins = [...new Set(rawOrigins.split(",").map((origin) => origin.trim()).filter(Boolean))]
    const parsed = z.array(originSchema).min(1).safeParse(allowedOrigins)
    if (!parsed.success) throw new Error("MEDIA_ALLOWED_ORIGINS contiene un origin no válido")
  }

  return allowedOrigins
}
