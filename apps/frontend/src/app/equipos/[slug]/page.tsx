"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  PersonalSummaryPanel,
  RecentAchievementsPanel,
  RecentAwardsPanel,
  TeamParticipationPanel,
  TeamStatsPanel,
  TopPlayersPanel,
} from "@/app/components/dashboard/TeamDashboardPanels"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import { useTeamContext } from "@/app/components/team/TeamShell"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { Skeleton } from "@/app/components/ui/Skeleton"
import { ApiError, apiFetch } from "@/lib/api"
import type { TeamDashboard } from "@/types/api"

type DashboardDataState = {
  slug: string
  value: TeamDashboard
}

type DashboardErrorState = {
  slug: string
  value: ApiError
}

export default function TeamDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const { team } = useTeamContext()
  const [dashboardState, setDashboardState] = useState<DashboardDataState | null>(null)
  const [errorState, setErrorState] = useState<DashboardErrorState | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const dashboard = dashboardState?.slug === slug ? dashboardState.value : null
  const error = errorState?.slug === slug ? errorState.value : null

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<TeamDashboard>(`/api/equipos/${encodeURIComponent(slug)}/dashboard`, {
      auth: true,
      signal: controller.signal,
    })
      .then((data) => setDashboardState({ slug, value: data }))
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return
        setErrorState({
          slug,
          value: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el dashboard", 500),
        })
      })

    return () => controller.abort()
  }, [requestVersion, slug])

  function retry() {
    setDashboardState(null)
    setErrorState(null)
    setRequestVersion((version) => version + 1)
  }

  return (
    <div className="w-full px-[var(--lb-page-gutter)] py-[var(--lb-page-gutter)]">
      <h1 className="sr-only">Dashboard de {team.nombre}</h1>

      {error ? (
        <DashboardError error={error} onRetry={retry} />
      ) : dashboard === null ? (
        <DashboardSkeleton />
      ) : (
        <DashboardContent dashboard={dashboard} slug={slug} />
      )}
    </div>
  )
}

function DashboardContent({ dashboard, slug }: { dashboard: TeamDashboard; slug: string }) {
  return (
    <>
      <div
        className="grid gap-[var(--lb-panel-gap)] md:grid-cols-2 xl:grid-cols-[minmax(0,38fr)_minmax(0,33fr)_minmax(0,29fr)]"
        data-dashboard-band="overview"
      >
        <TeamParticipationPanel totals={dashboard.totals} className="min-h-80 xl:h-[20.5rem] xl:min-h-0" />
        <TeamStatsPanel dashboard={dashboard} className="min-h-80 xl:h-[20.5rem] xl:min-h-0" />
        <RecentAwardsPanel awards={dashboard.recentAwards} className="min-h-80 md:col-span-2 xl:col-span-1 xl:h-[20.5rem] xl:min-h-0" />
      </div>

      <div
        className="mt-[var(--lb-panel-gap)] grid gap-[var(--lb-panel-gap)] md:grid-cols-2 xl:grid-cols-[minmax(0,38fr)_minmax(0,27fr)_minmax(0,35fr)]"
        data-dashboard-band="details"
      >
        <RecentAchievementsPanel achievements={dashboard.recentAchievements} slug={slug} className="min-h-72 md:col-span-2 xl:col-span-1 xl:h-[18.5rem] xl:min-h-0" />
        <PersonalSummaryPanel summary={dashboard.me} className="min-h-72 xl:h-[18.5rem] xl:min-h-0" />
        <TopPlayersPanel players={dashboard.topPlayers} slug={slug} className="min-h-72 xl:h-[18.5rem] xl:min-h-0" />
      </div>
    </>
  )
}

function DashboardSkeleton() {
  const skeletonClass = "min-h-80 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:h-[20.5rem] xl:min-h-0"
  const secondarySkeletonClass = "min-h-72 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] xl:h-[18.5rem] xl:min-h-0"

  return (
    <div role="status" aria-live="polite">
      <div className="grid gap-[var(--lb-panel-gap)] md:grid-cols-2 xl:grid-cols-[minmax(0,38fr)_minmax(0,33fr)_minmax(0,29fr)]">
        <Skeleton className={skeletonClass} />
        <Skeleton className={skeletonClass} />
        <Skeleton className={`${skeletonClass} md:col-span-2 xl:col-span-1`} />
      </div>
      <div className="mt-[var(--lb-panel-gap)] grid gap-[var(--lb-panel-gap)] md:grid-cols-2 xl:grid-cols-[minmax(0,38fr)_minmax(0,27fr)_minmax(0,35fr)]">
        <Skeleton className={`${secondarySkeletonClass} md:col-span-2 xl:col-span-1`} />
        <Skeleton className={secondarySkeletonClass} />
        <Skeleton className={secondarySkeletonClass} />
      </div>
      <span className="sr-only">Cargando el dashboard del equipo…</span>
    </div>
  )
}

function DashboardError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isUnauthorized = error.status === 401
  const isForbidden = error.status === 403
  const isNotFound = error.status === 404
  const title = isUnauthorized
    ? "Tu sesión ha caducado"
    : isForbidden
      ? "No tienes acceso a este equipo"
      : isNotFound
        ? "No encontramos este equipo"
        : "No pudimos cargar el dashboard"
  const description = isUnauthorized
    ? "Inicia sesión de nuevo para continuar."
    : isForbidden
      ? "Vuelve a tus equipos para elegir una membresía disponible."
      : isNotFound
        ? "Comprueba el enlace o vuelve a tus equipos."
        : "Revisa la conexión e inténtalo otra vez."

  return (
    <TeamSurface role="alert" className="max-w-xl border-[var(--lb-color-danger)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-danger-surface)] text-[var(--lb-color-danger)]" aria-hidden="true">
          <MaterialIcon name="assignment" className="size-5" />
        </span>
        <div>
          <h2 className="team-display text-xl font-extrabold text-[var(--team-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--team-muted)]">{description}</p>
        </div>
      </div>
      <div className="mt-5">
        {isUnauthorized ? (
          <DashboardStateLink href="/login">Iniciar sesión</DashboardStateLink>
        ) : isForbidden || isNotFound ? (
          <DashboardStateLink href="/equipos">Volver a mis equipos</DashboardStateLink>
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

function DashboardStateLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
    >
      {children}
    </Link>
  )
}
