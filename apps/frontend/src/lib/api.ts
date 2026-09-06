import type { ApiErrorBody } from "@/types/api"

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

type ApiFetchOptions = RequestInit & { auth?: boolean }

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth, headers, ...request } = options
  void auth // Compatibilidad temporal con los call sites; la cookie viaja automáticamente.
  const requestHeaders = new Headers(headers)

  if (request.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  const response = await fetch(path, { ...request, headers: requestHeaders, credentials: "same-origin" })
  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // Responses without JSON still become a consistent ApiError below.
    }

    throw new ApiError(body.error ?? body.message ?? "No se pudo completar la petición", response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
