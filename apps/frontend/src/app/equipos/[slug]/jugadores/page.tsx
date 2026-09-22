"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { TeamPlayersView } from "@/app/components/players/TeamPlayersView"
import { PageHeader } from "@/app/components/team/PageHeader"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import { useTeamContext } from "@/app/components/team/TeamShell"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { Skeleton } from "@/app/components/ui/Skeleton"
import { ApiError, apiFetch } from "@/lib/api"
import type { DashboardPlayer } from "@/types/api"

type PlayersDataState = {
  slug: string
  value: DashboardPlayer[]
}

type PlayersErrorState = {
  slug: string
  value: ApiError
}

export default function JugadoresPage() {
  const { slug } = useParams<{ slug: string }>()
  const { team, me } = useTeamContext()
  const [dataState, setDataState] = useState<PlayersDataState | null>(null)
  const [errorState, setErrorState] = useState<PlayersErrorState | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const players = dataState?.slug === slug ? dataState.value : null
  const error = errorState?.slug === slug ? errorState.value : null

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<DashboardPlayer[]>(`/api/equipos/${encodeURIComponent(slug)}/jugadores`, {
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
          value: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el directorio", 500),
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
    <div className="w-full min-w-0 px-[var(--lb-page-gutter)] py-[var(--lb-page-gutter)]">
      <PageHeader
        title="Jugadores"
        description={`Conoce a los miembros de ${team.nombre} y consulta su aportación al equipo.`}
      />

      {error ? (
        <PlayersError error={error} onRetry={retry} />
      ) : players === null ? (
        <PlayersSkeleton />
      ) : (
        <TeamPlayersView players={players} currentUserId={me.id} />
      )}
    </div>
  )
}

function PlayersSkeleton() {
  return (
    <div role="status" aria-live="polite" className="min-w-0">
      <div className="mt-4 grid min-w-0 grid-cols-2 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] sm:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-20 rounded-none border-r border-[var(--team-line)] last:border-r-0" />
        ))}
      </div>
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] xl:items-start" aria-hidden="true">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)]">
          <Skeleton className="aspect-[2/1] min-h-[16rem] min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)]" />
          <Skeleton className="min-h-40 min-w-0 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)]" />
        </div>
        <div className="min-w-0 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)]">
          <Skeleton className="h-24 rounded-none" />
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-none border-t border-[var(--team-line)]" />
          ))}
        </div>
      </div>
      <Skeleton className="mt-[var(--lb-panel-gap)] aspect-[4/1] min-h-20 min-w-0 rounded-[var(--lb-radius-panel)] sm:aspect-[8/1] xl:aspect-[13/1]" aria-hidden="true" />
      <span className="sr-only">Cargando los miembros del equipo…</span>
    </div>
  )
}

function PlayersError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isUnauthorized = error.status === 401
  const isForbidden = error.status === 403
  const isNotFound = error.status === 404
  const title = isUnauthorized
    ? "Tu sesión ha caducado"
    : isForbidden
      ? "No tienes acceso a este equipo"
      : isNotFound
        ? "No encontramos este equipo"
        : "No pudimos cargar los jugadores"
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
          <MaterialIcon name="groups" className="size-5" />
        </span>
        <div>
          <h2 className="team-display text-xl font-extrabold text-[var(--team-text)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--team-muted)]">{description}</p>
        </div>
      </div>
      <div className="mt-5">
        {isUnauthorized ? (
          <PlayersStateLink href="/login">Iniciar sesión</PlayersStateLink>
        ) : isForbidden || isNotFound ? (
          <PlayersStateLink href="/equipos">Volver a mis equipos</PlayersStateLink>
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

function PlayersStateLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
    >
      {children}
    </Link>
  )
}
