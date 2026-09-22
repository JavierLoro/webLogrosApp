import { apiFetch, ApiError } from "@/lib/api"
import type { LoginResponse } from "@/types/api"

export async function getAuthSession(): Promise<LoginResponse | null> {
  try {
    return await apiFetch<LoginResponse>("/api/auth/session")
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}

export async function logoutAuthSession(): Promise<void> {
  await apiFetch<void>("/api/auth/logout", { method: "POST" })
  localStorage.removeItem("teams")
  localStorage.removeItem("isSuperAdmin")
  window.dispatchEvent(new Event("auth-change"))
}
