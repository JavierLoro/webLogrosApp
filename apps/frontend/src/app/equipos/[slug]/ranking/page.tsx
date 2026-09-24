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
import type { Season, TeamRanking } from "@/types/api"

type RankingDataState = {
  key: string
  value: TeamRanking
}

type RankingErrorState = {
  key: string
  value: ApiError
}

export default function RankingPage() {
  const { slug } = useParams<{ slug: string }>()
  const [dataState, setDataState] = useState<RankingDataState | null>(null)
  const [errorState, setErrorState] = useState<RankingErrorState | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [selection, setSelection] = useState({ slug, id: "current" })
  const selected = selection.slug === slug ? selection.id : "current"
  const key = `${slug}:${selected}:${requestVersion}`
  const [seasonsState, setSeasonsState] = useState<{ slug: string; data?: Season[]; error?: ApiError } | null>(null)
  const seasons = seasonsState?.slug === slug ? seasonsState : null
  const ranking = dataState?.key === key ? dataState.value : null
  const error = errorState?.key === key ? errorState.value : null

  useEffect(() => {
    const controller = new AbortController()

    const base = `/api/equipos/${encodeURIComponent(slug)}`
    apiFetch<TeamRanking>(selected === "current" ? `${base}/ranking` : `${base}/temporadas/${selected}/ranking`, {
      signal: controller.signal,
    })
      .then((value) => {
        if (controller.signal.aborted) return
        setDataState({ key, value })
        setErrorState(null)
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setErrorState({
          key,
          value: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el ranking", 500),
        })
      })

    return () => controller.abort()
  }, [key, selected, slug])

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<Season[]>(`/api/equipos/${encodeURIComponent(slug)}/temporadas`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setSeasonsState({ slug, data }) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setSeasonsState({ slug, error: cause instanceof ApiError ? cause : new ApiError("No se pudieron cargar las temporadas", 500) })
      })
    return () => controller.abort()
  }, [slug, requestVersion])

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

      <TeamSurface className="mb-5 mt-4">
        <div className="flex min-w-0 flex-wrap items-end gap-4">
          <label htmlFor="ranking-season" className="grid min-w-0 max-w-full gap-2 text-sm font-semibold">Temporada
            <select id="ranking-season" className="min-h-11 min-w-0 max-w-full rounded-md border border-[var(--team-line)] bg-[var(--team-surface-low)] px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2" value={selected} onChange={event => setSelection({ slug, id: event.target.value })}>
              <option value="current">Actual</option>
              {seasons?.data?.filter(season => season.status !== "PLANNED").map(season => <option key={season.id} value={String(season.id)}>{season.name} · {season.status === "ACTIVE" ? "Activa" : "Cerrada"}</option>)}
            </select>
          </label>
          <p className="min-w-0 flex-1 basis-64 [overflow-wrap:anywhere] text-sm leading-6 text-[var(--team-muted)]">{ranking ? ranking.season ? `Incluye los logros permanentes y los estacionales de ${ranking.season.name}.` : "No hay temporada activa: se muestran solo los logros permanentes." : "Cada periodo suma los logros permanentes y los estacionales de la temporada seleccionada."} Las concesiones permanentes y las aprobaciones posteriores pueden actualizar estos resultados.</p>
        </div>
        {ranking?.season && <p className="mt-3 min-w-0 [overflow-wrap:anywhere] text-sm font-semibold">{ranking.season.name} · {ranking.season.status === "ACTIVE" ? "Activa" : ranking.season.status === "CLOSED" ? "Cerrada" : "Planificada"}</p>}
        {!seasons && <p role="status" className="mt-3 text-sm">Cargando temporadas…</p>}
        {seasons?.error && <div role="alert" className="mt-3 text-sm"><p>{seasons.error.message}</p>{seasons.error.status === 401 ? <Link href="/login" className="underline">Iniciar sesión</Link> : <button type="button" className="min-h-11 underline" onClick={retry}>Reintentar temporadas</button>}</div>}
      </TeamSurface>
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
