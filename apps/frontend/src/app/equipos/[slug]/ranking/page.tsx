"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { TeamRankingView } from "@/app/components/ranking/TeamRankingView"
import { PageHeader } from "@/app/components/team/PageHeader"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { Skeleton } from "@/app/components/ui/Skeleton"
import { ApiError, apiFetch } from "@/lib/api"
import type { TeamRanking } from "@/types/api"

type RankingDataState = {
  slug: string
  value: TeamRanking
}

type RankingErrorState = {
  slug: string
  value: ApiError
}

export default function RankingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [dataState, setDataState] = useState<RankingDataState | null>(null)
  const [errorState, setErrorState] = useState<RankingErrorState | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const ranking = dataState?.slug === slug ? dataState.value : null
  const error = errorState?.slug === slug ? errorState.value : null

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<TeamRanking>(`/api/equipos/${encodeURIComponent(slug)}/ranking`, {
      signal: controller.signal,
    })
      .then((value) => {
        setDataState({ slug, value })
        setErrorState(null)
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setErrorState({
          slug,
          value: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el ranking", 500),
        })
      })

    return () => controller.abort()
  }, [requestVersion, slug])

  function retry() {
    setDataState(null)
    setErrorState(null)
    setRequestVersion((version) => version + 1)
  }

  return (
    <div className="w-full px-[var(--lb-page-gutter)] py-[var(--lb-page-gutter)]">
      <PageHeader
        title="Ranking del equipo"
        description="La constancia también puntúa. Consulta las posiciones y estadísticas acumuladas del equipo."
      />

      {error ? (
        <RankingError error={error} onRetry={retry} />
      ) : ranking === null ? (
        <RankingSkeleton />
      ) : (
        <TeamRankingView ranking={ranking} />
      )}
    </div>
  )
}

function RankingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,61fr)_minmax(20rem,39fr)] xl:items-start"
    >
      <Skeleton className="min-h-64 min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:col-start-1 xl:row-start-1" />
      <Skeleton className="min-h-64 min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:col-start-2 xl:row-start-1" />
      <div className="min-w-0 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:col-start-1 xl:row-start-2" aria-hidden="true">
        <Skeleton className="h-20 rounded-none" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 rounded-none border-t border-[var(--team-line)]" />
        ))}
      </div>
      <Skeleton className="min-h-40 min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:col-start-1 xl:row-start-3" />
      <Skeleton className="aspect-[4/1] min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:col-start-2 xl:row-start-3" />
      <span className="sr-only">Cargando el ranking del equipo…</span>
    </div>
  )
}

function RankingError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isUnauthorized = error.status === 401
  const isForbidden = error.status === 403
  const isNotFound = error.status === 404
  const title = isUnauthorized
    ? "Tu sesión ha caducado"
    : isForbidden
      ? "No tienes acceso a este equipo"
      : isNotFound
        ? "No encontramos este equipo"
        : "No pudimos cargar el ranking"
  const description = isUnauthorized
    ? "Inicia sesión de nuevo para continuar."
    : isForbidden
      ? "Vuelve a tus equipos para elegir una membresía disponible."
      : isNotFound
        ? "Comprueba el enlace o vuelve a tus equipos."
        : "Revisa la conexión e inténtalo otra vez."

  return (
    <TeamSurface role="alert" className="mt-4 max-w-xl border-[var(--lb-color-danger)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-danger-surface)] text-[var(--lb-color-danger)]" aria-hidden="true">
          <MaterialIcon name="leaderboard" className="size-5" />
        </span>
        <div>
          <h2 className="team-display text-xl font-extrabold text-[var(--team-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--team-muted)]">{description}</p>
        </div>
      </div>
      <div className="mt-5">
        {isUnauthorized ? (
          <RankingStateLink href="/login">Iniciar sesión</RankingStateLink>
        ) : isForbidden || isNotFound ? (
          <RankingStateLink href="/equipos">Volver a mis equipos</RankingStateLink>
        ) : (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
          >
            Reintentar
          </button>
        )}
      </div>
    </TeamSurface>
  )
}

function RankingStateLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
    >
      {children}
    </Link>
  )
}
