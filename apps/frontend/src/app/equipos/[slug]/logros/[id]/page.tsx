"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import { Button } from "@/app/components/ui/Button"
import { ErrorMessage } from "@/app/components/ui/Error"
import { LoadingState } from "@/app/components/logros/LoadingState"
import type { Logro } from "@/types/api"

export default function LogroDetallePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params)
  const [logro, setLogro] = useState<Logro | null>(null)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    apiFetch<Logro>(
      `/api/equipos/${encodeURIComponent(slug)}/logros/${encodeURIComponent(id)}`,
      { auth: true },
    )
      .then((data) => {
        if (active) setLogro(data)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error("No se pudo cargar el logro."))
      })

    return () => {
      active = false
    }
  }, [id, requestVersion, slug])

  function retry() {
    setLogro(null)
    setError(null)
    setRequestVersion((version) => version + 1)
  }

  if (!logro && !error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <Link
        className="font-mono text-xs uppercase tracking-widest text-coral"
        href={`/equipos/${slug}/logros`}
      >
        ← Volver al catálogo
      </Link>

      {error ? (
        <div className="space-y-4">
          <ErrorMessage>
            {error instanceof ApiError && error.status === 404
              ? "Este logro no existe en este equipo."
              : error instanceof ApiError && error.status === 401
                ? "Necesitas iniciar sesión para continuar."
                : error instanceof ApiError && error.status === 403
                  ? "No perteneces a este equipo. Usa una invitación para unirte."
                  : error.message}
          </ErrorMessage>
          <Button variant="quiet" onClick={retry}>Reintentar</Button>
        </div>
      ) : logro ? (
        <article className="rounded-3xl border border-paper-deep bg-white/70 p-8">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-coral">Logro del equipo</p>
          <h1 className="mt-4 font-display text-4xl font-bold">{logro.nombre}</h1>
          {logro.descripcion ? <p className="mt-4 leading-7 text-ink-soft">{logro.descripcion}</p> : null}
          <div className="mt-10 border-t border-paper-deep pt-6">
            <strong className="font-mono text-5xl text-coral">{logro.puntos}</strong>
            <span className="ml-3 font-mono text-xs uppercase tracking-widest text-ink-soft">puntos</span>
          </div>
        </article>
      ) : null}
    </div>
  )
}
