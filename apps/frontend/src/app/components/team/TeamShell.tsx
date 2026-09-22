"use client"

import Link from "next/link"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { TeamIdentity } from "./TeamIdentity"
import { TeamNavigation } from "./TeamNavigation"
import { ApiError, apiFetch } from "@/lib/api"
import type { TeamContext } from "@/types/api"

type TeamShellProps = {
  children: ReactNode
  slug: string
}

type ContextState =
  | { status: "loading"; slug: string }
  | { status: "ready"; slug: string; value: TeamContext }
  | { status: "error"; slug: string; error: ApiError }

const TeamContextValue = createContext<TeamContext | null>(null)

export function useTeamContext() {
  const context = useContext(TeamContextValue)
  if (!context) throw new Error("useTeamContext debe usarse dentro de TeamShell con contexto cargado")
  return context
}

export function TeamShell({ children, slug }: TeamShellProps) {
  const [requestVersion, setRequestVersion] = useState(0)
  const [state, setState] = useState<ContextState>({ status: "loading", slug })
  const currentState: ContextState = state.slug === slug ? state : { status: "loading", slug }
  const context = currentState.status === "ready" ? currentState.value : null
  const teamName = context?.team.nombre ?? "Equipo"

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<TeamContext>(`/api/equipos/${encodeURIComponent(slug)}/contexto`, { signal: controller.signal })
      .then((value) => setState({ status: "ready", slug, value }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        const error = cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el contexto del equipo", 500)
        setState({ status: "error", slug, error })
      })

    return () => controller.abort()
  }, [requestVersion, slug])

  function retry() {
    setState({ status: "loading", slug })
    setRequestVersion((version) => version + 1)
  }

  return (
    <div className="team-theme min-h-dvh flex-1 bg-[var(--team-surface-lowest)] text-[var(--team-text)]">
      <a
        href="#team-main-content"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <TeamNavigation slug={slug} teamName={teamName} role={context?.me.role} loading={currentState.status === "loading"} />
      <div className="min-w-0 md:pl-[var(--lb-sidebar-width)]">
        <TeamIdentity
          slug={slug}
          teamName={teamName}
          userName={context?.me.displayName}
          role={context?.me.role}
          loading={currentState.status === "loading"}
        />
        <main id="team-main-content" tabIndex={-1} className="min-w-0">
          {currentState.status === "loading" ? (
            <TeamContextLoading />
          ) : currentState.status === "error" ? (
            <TeamContextError error={currentState.error} onRetry={retry} />
          ) : (
            <TeamContextValue.Provider value={currentState.value}>{children}</TeamContextValue.Provider>
          )}
        </main>
      </div>
    </div>
  )
}

function TeamContextLoading() {
  return (
    <div className="px-[var(--lb-page-gutter)] py-8" role="status" aria-live="polite">
      <div className="max-w-xl animate-pulse rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] p-5">
        <div className="h-3 w-28 rounded bg-[var(--team-surface-strong)]" />
        <div className="mt-4 h-8 w-64 max-w-full rounded bg-[var(--team-surface-strong)]" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-[var(--team-surface-strong)]" />
      </div>
      <span className="sr-only">Cargando el espacio del equipo…</span>
    </div>
  )
}

function TeamContextError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isUnauthorized = error.status === 401
  const isForbidden = error.status === 403
  const isNotFound = error.status === 404
  const title = isUnauthorized
    ? "Tu sesión ha caducado"
    : isForbidden
      ? "No tienes acceso a este equipo"
      : isNotFound
        ? "No encontramos este equipo"
        : "No pudimos cargar el equipo"
  const description = isUnauthorized
    ? "Inicia sesión de nuevo para continuar."
    : isForbidden
      ? "El equipo no forma parte de tus membresías actuales."
      : isNotFound
        ? "Comprueba el enlace o vuelve a tus equipos."
        : "Revisa la conexión e inténtalo otra vez."

  return (
    <div className="px-[var(--lb-page-gutter)] py-8">
      <section role="alert" className="max-w-xl rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-danger)] bg-[var(--lb-color-danger-surface)] p-5">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[var(--lb-color-danger)]">Acceso al equipo</p>
        <h1 className="team-display mt-2 text-2xl font-black text-[var(--team-text)]">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--team-muted)]">{description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {isUnauthorized ? (
            <Link href="/login" className="inline-flex min-h-10 items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white">Iniciar sesión</Link>
          ) : isForbidden || isNotFound ? (
            <Link href="/equipos" className="inline-flex min-h-10 items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white">Volver a mis equipos</Link>
          ) : (
            <button type="button" onClick={onRetry} className="inline-flex min-h-10 items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white">Reintentar</button>
          )}
        </div>
      </section>
    </div>
  )
}
