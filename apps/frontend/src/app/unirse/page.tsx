"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import type { TeamSummary } from "@/types/api"

type Preview = { team: { slug: string; nombre: string }; expiresAt: string; remainingUses: number }

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-5 py-12"><p className="text-ink-soft">Preparando la invitación…</p></main>}>
      <JoinTeamContent />
    </Suspense>
  )
}

function JoinTeamContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState(params.get("token") ?? "")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [checking, setChecking] = useState(false)
  const [joining, setJoining] = useState(false)

  async function checkInvitation(value: string) {
    const cleanToken = value.trim()
    if (!cleanToken) {
      setError("Introduce el código de la invitación.")
      return
    }

    setChecking(true)
    setError("")
    try {
      const result = await apiFetch<Preview>(`/api/invitaciones/preview?token=${encodeURIComponent(cleanToken)}`)
      setPreview(result)
    } catch (cause) {
      setPreview(null)
      setError(cause instanceof ApiError ? cause.message : "No hemos podido comprobar esta invitación. Vuelve a intentarlo.")
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    if (token) void checkInvitation(token)
    // El token inicial solo se comprueba al abrir la página. Los cambios posteriores
    // se validan al pulsar el botón, para no lanzar una petición por cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function join() {
    setJoining(true)
    setError("")
    try {
      const result = await apiFetch<{ team: TeamSummary }>("/api/invitaciones/join", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ token: token.trim() }),
      })
      setMessage(`Te has unido a ${result.team.nombre}.`)
      router.push(`/equipos/${result.team.slug}`)
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "Inicia sesión antes de usar esta invitación."
          : cause instanceof ApiError
            ? cause.message
            : "No hemos podido añadirte al equipo. Vuelve a intentarlo.",
      )
    } finally {
      setJoining(false)
    }
  }

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <h1 className="font-display text-4xl font-bold">Abre tu invitación</h1>
      <p className="mt-3 text-ink-soft">Pega el código que te envió un administrador para ver el equipo antes de unirte.</p>
      <label className="sr-only" htmlFor="invitation-token">Código de invitación</label>
      <input
        id="invitation-token"
        value={token}
        onChange={(event) => {
          setToken(event.target.value)
          setPreview(null)
          setError("")
        }}
        placeholder="Código de invitación"
        className="mt-8 min-h-11 w-full rounded-md border border-ink/20 bg-paper px-3"
      />

      {preview && (
        <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-5">
          <p className="font-display text-2xl font-semibold">{preview.team.nombre}</p>
          <p className="mt-1 text-sm text-ink-soft">
            Invitación válida · {preview.remainingUses} {preview.remainingUses === 1 ? "uso disponible" : "usos disponibles"}
          </p>
          <button disabled={joining} onClick={join} className="mt-5 rounded-full bg-coral px-5 py-3 font-semibold text-white disabled:opacity-50">
            {joining ? "Uniéndome…" : `Unirme a ${preview.team.nombre}`}
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-5 text-coral">{error}</p>}
      {message && <p role="status" className="mt-5 text-mint">{message}</p>}

      {!preview && (
        <button
          disabled={checking}
          onClick={() => void checkInvitation(token)}
          className="mt-5 rounded-full border border-ink/20 px-5 py-3 font-semibold disabled:opacity-50"
        >
          {checking ? "Comprobando…" : "Ver invitación"}
        </button>
      )}
    </main>
  )
}
