import type {
  Achievement,
  AchievementStatus,
} from "../types/domain"
import {
  ApiClientError,
  type ApiClientOptions,
  type CreateAchievementInput,
  type GetAchievementOptions,
  type GetAchievementsOptions,
} from "../types/api"

const DEFAULT_BACKEND_URL = "http://localhost:3001"

type Parser<T> = (value: unknown) => T | null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === "string" ? value : null
}

function readAchievementStatus(value: unknown): AchievementStatus | null {
  if (
    value === "available" ||
    value === "in_progress" ||
    value === "pending" ||
    value === "earned" ||
    value === "rejected" ||
    value === "locked"
  ) {
    return value
  }
  return null
}

function toAchievement(value: unknown): Achievement | null {
  if (!isRecord(value)) return null

  const id = readNumber(value, "id")
  const teamId = readNumber(value, "teamId")
  const nombre = readString(value, "nombre")
  const puntos = readNumber(value, "puntos")
  if (id === null || teamId === null || nombre === null || puntos === null) return null

  return {
    id,
    teamId,
    nombre,
    puntos,
    descripcion: readString(value, "descripcion"),
    categoria: readString(value, "categoria"),
    icono: readString(value, "icono"),
    estado: readAchievementStatus(value["estado"]) ?? "available",
    fechaObtencion: readString(value, "fechaObtencion"),
  }
}

function decodeAchievementList(value: unknown): Achievement[] | null {
  if (!Array.isArray(value)) return null
  const achievements = value.map(toAchievement)
  if (achievements.some((achievement) => achievement === null)) return null
  return achievements.filter((achievement): achievement is Achievement => achievement !== null)
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, "")
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return normalizeBaseUrl(baseUrl)
  if (typeof window !== "undefined") return "/api"
  return normalizeBaseUrl(process.env.BACKEND_URL ?? DEFAULT_BACKEND_URL)
}

function getBrowserToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("token")
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiClientError("invalid_json", "La respuesta de la API no contiene JSON válido.")
  }
}

function responseMessage(value: unknown, fallback: string): string {
  if (isRecord(value) && typeof value.error === "string" && value.error.length > 0) {
    return value.error
  }
  return fallback
}

async function requestJson<T>(
  path: string,
  options: ApiClientOptions,
  parser: Parser<T>,
): Promise<T> {
  const fetcher = options.fetcher ?? fetch
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  if (options.token !== null) {
    const token = options.token ?? getBrowserToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetcher(`${resolveBaseUrl(options.baseUrl)}${path}`, {
      method: options.method,
      headers,
      body: options.body,
      signal: options.signal ?? AbortSignal.timeout(3000),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo conectar con la API."
    throw new ApiClientError("network_error", message)
  }

  const text = await response.text()
  const body = parseJson(text)
  if (!response.ok) {
    throw new ApiClientError(
      "http_error",
      responseMessage(body, `La API respondió con HTTP ${response.status}.`),
      { status: response.status, body },
    )
  }
  const parsed = parser(body)
  if (parsed === null) {
    throw new ApiClientError("invalid_response", "La respuesta de la API no cumple el contrato esperado.", {
      status: response.status,
      body,
    })
  }
  return parsed
}

function encodeSlug(slug: string): string {
  const normalized = slug.trim()
  if (!normalized) throw new ApiClientError("invalid_response", "El slug del equipo es obligatorio.")
  return encodeURIComponent(normalized)
}

function encodeAchievementId(id: number): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiClientError("invalid_response", "El id del logro debe ser un entero positivo.")
  }
  return String(id)
}

function withFallback<T>(fallback: T | undefined, action: () => Promise<T>): Promise<T> {
  return action().catch((error: unknown) => {
    if (fallback !== undefined && error instanceof ApiClientError) return fallback
    throw error
  })
}

/** GET /equipos/:slug/logros — endpoint de lectura real, con slug obligatorio. */
export function getAchievements(
  slug: string,
  options: GetAchievementsOptions = {},
): Promise<Achievement[]> {
  return withFallback(options.fallback ? [...options.fallback] : undefined, () =>
    requestJson(`/equipos/${encodeSlug(slug)}/logros`, options, decodeAchievementList),
  )
}

/** GET /equipos/:slug/logros/:id — detalle real, restringido por el backend al equipo. */
export function getAchievement(
  slug: string,
  id: number,
  options: GetAchievementOptions = {},
): Promise<Achievement | null> {
  return withFallback(options.fallback, () =>
    requestJson(`/equipos/${encodeSlug(slug)}/logros/${encodeAchievementId(id)}`, options, toAchievement),
  )
}

/** POST /equipos/:slug/logros — único endpoint de escritura disponible actualmente. */
export function createAchievement(
  slug: string,
  input: CreateAchievementInput,
  options: ApiClientOptions = {},
): Promise<Achievement> {
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")
  return requestJson(
    `/equipos/${encodeSlug(slug)}/logros`,
    {
      ...options,
      method: "POST",
      headers,
      body: JSON.stringify(input),
    },
    toAchievement,
  )
}
