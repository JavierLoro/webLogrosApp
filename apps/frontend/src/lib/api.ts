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
  const { auth = false, headers, ...request } = options
  const requestHeaders = new Headers(headers)

  if (request.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  if (auth) {
    const token = typeof window === "undefined" ? null : localStorage.getItem("token")
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(path, { ...request, headers: requestHeaders })
  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // Responses without JSON still become a consistent ApiError below.
    }

    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token")
      window.dispatchEvent(new Event("auth-change"))
    }

    throw new ApiError(body.error ?? body.message ?? "No se pudo completar la petición", response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

