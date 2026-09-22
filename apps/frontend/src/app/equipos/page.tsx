"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { OnboardingHeader } from "@/app/components/onboarding/OnboardingHeader"
import { TeamsOverview } from "@/app/components/onboarding/TeamsOverview"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { apiFetch, ApiError } from "@/lib/api"
import type { TeamSummary } from "@/types/api"

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<TeamSummary[]>("/api/equipos/mis-equipos", { signal: controller.signal })
      .then((result) => {
        setTeams(result)
        setError(null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setError(cause instanceof ApiError ? cause : new ApiError("No se pudieron cargar tus equipos", 500))
      })

    return () => controller.abort()
  }, [requestVersion])

  function retry() {
    setTeams(null)
    setError(null)
    setRequestVersion((current) => current + 1)
  }

  return (
    <main className="min-h-dvh bg-[var(--lb-color-bg-deep)] [font-family:var(--lb-font-body)] text-[var(--lb-color-text-primary)]">
      <OnboardingHeader />
      <div className="mx-auto w-full max-w-[78rem] px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col justify-between gap-5 border-b border-[var(--lb-color-border)] pb-6 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="[font-family:var(--lb-font-display)] text-[clamp(2rem,3.2vw,2.5rem)] font-bold leading-[1.05] tracking-[-0.035em]">Mis equipos</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--lb-color-text-secondary)]">Selecciona uno de tus equipos para continuar.</p>
          </div>
          <Link href="/unirse" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--lb-color-focus)]">
            <span aria-hidden="true">+</span> Unirse a un equipo
          </Link>
        </header>

        {error ? (
          <TeamsError error={error} onRetry={retry} />
        ) : teams === null ? (
          <TeamsLoading />
        ) : (
          <TeamsOverview teams={teams} />
        )}
      </div>
    </main>
  )
}

function TeamsLoading() {
  return (
    <div role="status" aria-live="polite" className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} aria-hidden="true" className="min-h-72 animate-pulse rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-border)] bg-[var(--lb-color-surface-base)] p-5 sm:min-h-[22rem] lg:min-h-[26rem]">
          <div className="h-32 w-full rounded-[var(--lb-radius-control)] bg-[var(--lb-color-surface-strong)]" />
          <div className="mt-4 h-3 w-24 rounded bg-[var(--lb-color-surface-strong)]" />
          <div className="mt-3 h-7 w-3/4 rounded bg-[var(--lb-color-surface-strong)]" />
          <div className="mt-6 h-14 rounded bg-[var(--lb-color-surface-raised)]" />
        </div>
      ))}
      <span className="sr-only">Cargando tus equipos…</span>
    </div>
  )
}

function TeamsError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const unauthorized = error.status === 401

  return (
    <section role="alert" className="mt-7 max-w-2xl rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-danger)] bg-[var(--lb-color-danger-surface)] p-5" aria-labelledby="teams-error-title">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-bg-deep)] text-[var(--lb-color-danger)]">
          <MaterialIcon name="groups" className="size-5" />
        </span>
        <div>
          <h2 id="teams-error-title" className="[font-family:var(--lb-font-display)] text-xl font-bold">{unauthorized ? "Inicia sesión para ver tus equipos" : "No pudimos cargar tus equipos"}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--lb-color-text-secondary)]">{unauthorized ? "Tu sesión no está disponible o ha caducado." : error.message}</p>
        </div>
      </div>
      <div className="mt-5">
        {unauthorized ? (
          <Link href="/login" className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-2 text-sm font-bold text-white">Iniciar sesión</Link>
        ) : (
          <button type="button" onClick={onRetry} className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]">Reintentar</button>
        )}
      </div>
    </section>
  )
}
