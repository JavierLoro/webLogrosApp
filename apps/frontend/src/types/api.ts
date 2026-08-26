import type { Achievement } from "./domain"

/** Error serializado por Express (`{ error: string }`) o creado por el cliente. */
export interface ApiErrorBody {
  error: string
}

export type ApiErrorCode =
  | "http_error"
  | "network_error"
  | "invalid_json"
  | "invalid_response"

export interface ApiErrorDetails {
  status: number | null
  body: unknown
}

export class ApiClientError extends Error {
  readonly code: ApiErrorCode
  readonly status: number | null
  readonly body: unknown

  constructor(code: ApiErrorCode, message: string, details: ApiErrorDetails = { status: null, body: null }) {
    super(message)
    this.name = "ApiClientError"
    this.code = code
    this.status = details.status
    this.body = details.body
  }
}

export interface CreateAchievementInput {
  nombre: string
  puntos: number
}

export interface ApiClientOptions {
  /** Override útil para tests o para un caller server-side con una URL propia. */
  baseUrl?: string
  /** Si se omite en navegador, se intenta leer el JWT de localStorage. */
  token?: string | null
  fetcher?: typeof fetch
  headers?: HeadersInit
  method?: string
  body?: BodyInit | null
  signal?: AbortSignal
}

export interface GetAchievementsOptions extends ApiClientOptions {
  /** Fallback explícito del caller; nunca se activa por defecto. */
  fallback?: readonly Achievement[]
}

export interface GetAchievementOptions extends ApiClientOptions {
  /** Fallback explícito del caller; nunca se activa por defecto. */
  fallback?: Achievement | null
}
