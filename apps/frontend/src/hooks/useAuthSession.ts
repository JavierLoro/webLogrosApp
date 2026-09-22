"use client"

import { useEffect, useState } from "react"
import { getAuthSession } from "@/lib/authSession"
import type { LoginResponse } from "@/types/api"

export function useAuthSession() {
  const [session, setSession] = useState<LoginResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function refresh() {
      try {
        const current = await getAuthSession()
        if (active) setSession(current)
      } catch {
        if (active) setSession(null)
      } finally {
        if (active) setLoading(false)
      }
    }

    void refresh()
    window.addEventListener("auth-change", refresh)
    window.addEventListener("storage", refresh)
    return () => {
      active = false
      window.removeEventListener("auth-change", refresh)
      window.removeEventListener("storage", refresh)
    }
  }, [])

  return { session, loading }
}
