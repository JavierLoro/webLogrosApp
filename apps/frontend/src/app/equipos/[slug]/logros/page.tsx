"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { LogroCard } from "@/app/components/logros/LogroCard"
import { PageHeader } from "@/app/components/team/PageHeader"
import { TeamSurface, TeamToolbar } from "@/app/components/team/TeamPrimitives"
import { useTeamContext } from "@/app/components/team/TeamShell"
import MaterialIcon, { type MaterialIconName } from "@/app/components/ui/icons/MaterialIcon"
import { ApiError, apiFetch } from "@/lib/api"
import type { CatalogAchievement } from "@/types/api"

const ALL_CATEGORIES = "__all__"

type CatalogDataState = {
  slug: string
  value: CatalogAchievement[]
}

type CatalogErrorState = {
  slug: string
  value: ApiError
}

type CatalogMetric = {
  label: string
  value: number
  icon: MaterialIconName
}

export default function LogrosPage() {
  const { slug } = useParams<{ slug: string }>()
  const { me } = useTeamContext()
  const [dataState, setDataState] = useState<CatalogDataState | null>(null)
  const [errorState, setErrorState] = useState<CatalogErrorState | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState(ALL_CATEGORIES)
  const achievements = dataState?.slug === slug ? dataState.value : null
  const error = errorState?.slug === slug ? errorState.value : null
  const isTeamAdmin = me.role === "TEAM_ADMIN"
  const actionLabel = isTeamAdmin ? "Crear logro" : "Proponer logro"

  useEffect(() => {
    const controller = new AbortController()

    apiFetch<CatalogAchievement[]>(`/api/equipos/${encodeURIComponent(slug)}/logros`, {
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
          value: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar el catálogo", 500),
        })
      })

    return () => controller.abort()
  }, [requestVersion, slug])

  const categories = useMemo(
    () => Array.from(new Set((achievements ?? []).map((item) => item.categoria?.trim()).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b, "es")),
    [achievements],
  )
  const activeCategory = category === ALL_CATEGORIES || categories.includes(category) ? category : ALL_CATEGORIES

  const filteredAchievements = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es-ES")

    return (achievements ?? []).filter((achievement) => {
      const searchable = `${achievement.nombre} ${achievement.descripcion ?? ""} ${achievement.categoria ?? ""}`.toLocaleLowerCase("es-ES")
      const matchesQuery = normalizedQuery.length === 0 || searchable.includes(normalizedQuery)
      const matchesCategory = activeCategory === ALL_CATEGORIES || achievement.categoria?.trim() === activeCategory
      return matchesQuery && matchesCategory
    })
  }, [achievements, activeCategory, query])

  const metrics = useMemo<CatalogMetric[]>(() => {
    const items = achievements ?? []
    return [
      { label: "Total", value: items.length, icon: "emoji_events" },
      { label: "Mis logros", value: items.filter((item) => item.earnedByMe).length, icon: "check" },
      { label: "Concesiones", value: items.reduce((sum, item) => sum + item.holdersCount, 0), icon: "groups" },
      { label: "Categorías", value: categories.length, icon: "flag" },
    ]
  }, [achievements, categories.length])

  function retry() {
    setDataState(null)
    setErrorState(null)
    setRequestVersion((version) => version + 1)
  }

  function clearFilters() {
    setQuery("")
    setCategory(ALL_CATEGORIES)
  }

  return (
    <div className="w-full px-[var(--lb-page-gutter)] py-[var(--lb-page-gutter)]">
      <div className="grid gap-4 border-b border-[var(--team-line)] pb-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <PageHeader
          title="Logros del equipo"
          description="Explora los hitos que el equipo reconoce y consulta quiénes los han conseguido."
          className="border-b-0 pb-0"
        />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch xl:justify-end">
          {achievements && !error ? <CatalogMetrics metrics={metrics} /> : <CatalogMetricsSkeleton />}
          <Link
            href={`/equipos/${slug}/logros/nuevo`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
          >
            <span aria-hidden="true">+</span> {actionLabel}
          </Link>
        </div>
      </div>

      {error ? (
        <CatalogError error={error} onRetry={retry} />
      ) : achievements === null ? (
        <CatalogLoading />
      ) : achievements.length === 0 ? (
        <CatalogEmpty actionLabel={actionLabel} isTeamAdmin={isTeamAdmin} slug={slug} />
      ) : (
        <>
          <CatalogFilters
            categories={categories}
            category={activeCategory}
            query={query}
            onCategoryChange={setCategory}
            onQueryChange={setQuery}
          />

          <div className="mt-3 flex min-h-6 items-center justify-between gap-4 text-xs text-[var(--team-muted)]">
            <p aria-live="polite">
              <span className="font-[var(--lb-font-data)] tabular-nums text-[var(--team-text)]">{filteredAchievements.length}</span>{" "}
              {filteredAchievements.length === 1 ? "logro" : "logros"}
            </p>
            {(query || activeCategory !== ALL_CATEGORIES) ? (
              <button
                type="button"
                className="min-h-10 rounded-[var(--lb-radius-control)] px-2 font-semibold text-[var(--team-primary)] hover:text-[var(--team-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
                onClick={clearFilters}
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {filteredAchievements.length > 0 ? (
            <div className="mt-2 grid grid-cols-1 gap-3 min-[32.5rem]:grid-cols-2 min-[56.25rem]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[86.25rem]:grid-cols-6">
              {filteredAchievements.map((achievement) => (
                <LogroCard key={achievement.id} logro={achievement} slug={slug} />
              ))}
            </div>
          ) : (
            <CatalogNoResults onClear={clearFilters} />
          )}
        </>
      )}
    </div>
  )
}

function CatalogMetrics({ metrics }: { metrics: CatalogMetric[] }) {
  return (
    <dl className="grid min-w-0 grid-cols-2 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] sm:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="flex min-h-11 min-w-0 items-center gap-2 border-r border-b border-[var(--team-line)] px-2.5 py-2 odd:last:border-r-0 sm:min-w-28 sm:border-b-0 sm:last:border-r-0">
          <MaterialIcon name={metric.icon} className="size-4 shrink-0 text-[var(--team-primary)]" />
          <div className="flex min-w-0 flex-col">
            <dt className="order-2 mt-1 truncate text-[0.625rem] uppercase leading-none tracking-[0.06em] text-[var(--team-muted)]" title={metric.label}>{metric.label}</dt>
            <dd className="order-1 font-[var(--lb-font-data)] text-lg font-semibold leading-none tabular-nums text-[var(--team-text)]">{metric.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

function CatalogMetricsSkeleton() {
  return (
    <div aria-hidden="true" className="grid min-h-14 min-w-0 grid-cols-4 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] sm:min-w-[28rem]">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="animate-pulse border-r border-[var(--team-line)] p-2 last:border-r-0">
          <div className="h-4 w-8 rounded bg-[var(--team-surface-strong)]" />
          <div className="mt-2 h-2 w-14 max-w-full rounded bg-[var(--team-surface-strong)]" />
        </div>
      ))}
    </div>
  )
}

type CatalogFiltersProps = {
  categories: string[]
  category: string
  query: string
  onCategoryChange: (category: string) => void
  onQueryChange: (query: string) => void
}

function CatalogFilters({ categories, category, query, onCategoryChange, onQueryChange }: CatalogFiltersProps) {
  return (
    <TeamToolbar aria-label="Buscar y filtrar logros" className="mt-3 justify-between gap-3">
      <div role="group" className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 sm:pb-0" aria-label="Filtrar por categoría">
        <CategoryButton active={category === ALL_CATEGORIES} onClick={() => onCategoryChange(ALL_CATEGORIES)}>Todos</CategoryButton>
        {categories.map((item) => (
          <CategoryButton key={item} active={category === item} onClick={() => onCategoryChange(item)}>{item}</CategoryButton>
        ))}
      </div>
      <label className="relative min-w-0 shrink-0 sm:w-64">
        <span className="sr-only">Buscar por nombre, descripción o categoría</span>
        <MaterialIcon name="track_changes" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--team-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar logros…"
          className="min-h-10 w-full rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] py-2 pr-3 pl-9 text-sm text-[var(--team-text)] outline-none placeholder:text-[var(--team-muted)] focus-visible:border-[var(--lb-color-focus)] focus-visible:ring-1 focus-visible:ring-[var(--lb-color-focus)]"
        />
      </label>
    </TeamToolbar>
  )
}

function CategoryButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 shrink-0 rounded-[var(--lb-radius-control)] border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] ${active ? "border-[var(--team-primary)] bg-[var(--team-primary)] text-white" : "border-[var(--team-line)] bg-[var(--team-surface-strong)] text-[var(--team-muted)] hover:border-[var(--team-outline-strong)] hover:text-[var(--team-text)]"}`}
    >
      {children}
    </button>
  )
}

function CatalogLoading() {
  return (
    <div role="status" aria-live="polite" className="mt-3">
      <div className="h-14 animate-pulse rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)]" />
      <div className="mt-8 grid grid-cols-1 gap-3 min-[32.5rem]:grid-cols-2 min-[56.25rem]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[86.25rem]:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} aria-hidden="true" className="overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)]">
            <div className="aspect-video animate-pulse bg-[var(--team-surface-strong)]" />
            <div className="space-y-2 p-3">
              <div className="h-2.5 w-1/2 animate-pulse rounded bg-[var(--team-surface-strong)]" />
              <div className="h-5 w-4/5 animate-pulse rounded bg-[var(--team-surface-strong)]" />
              <div className="h-8 animate-pulse rounded bg-[var(--team-surface-strong)]" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Cargando el catálogo del equipo…</span>
    </div>
  )
}

function CatalogEmpty({ actionLabel, isTeamAdmin, slug }: { actionLabel: string; isTeamAdmin: boolean; slug: string }) {
  return (
    <TeamSurface className="mt-4 grid min-h-64 place-items-center border-dashed text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-surface-strong)] text-[var(--team-primary)]" aria-hidden="true">
          <MaterialIcon name="emoji_events" className="size-6" />
        </span>
        <h2 className="team-display mt-4 text-2xl font-extrabold text-[var(--team-text)]">Todavía no hay logros</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--team-muted)]">
          {isTeamAdmin ? "Crea el primer logro para empezar el catálogo de este equipo." : "Propón la primera idea para que el equipo pueda revisarla."}
        </p>
        <Link href={`/equipos/${slug}/logros/nuevo`} className="mt-5 inline-flex min-h-11 items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white">
          {actionLabel}
        </Link>
      </div>
    </TeamSurface>
  )
}

function CatalogNoResults({ onClear }: { onClear: () => void }) {
  return (
    <TeamSurface className="mt-2 grid min-h-48 place-items-center border-dashed text-center">
      <div>
        <h2 className="team-display text-xl font-extrabold text-[var(--team-text)]">No hay coincidencias</h2>
        <p className="mt-2 text-sm text-[var(--team-muted)]">Prueba otro término o vuelve a mostrar todas las categorías.</p>
        <button type="button" onClick={onClear} className="mt-4 min-h-10 rounded-[var(--lb-radius-control)] border border-[var(--team-outline-strong)] px-4 py-2 text-sm font-semibold text-[var(--team-text)] hover:bg-[var(--team-surface-strong)]">
          Limpiar filtros
        </button>
      </div>
    </TeamSurface>
  )
}

function CatalogError({ error, onRetry }: { error: ApiError; onRetry: () => void }) {
  const isUnauthorized = error.status === 401
  const isForbidden = error.status === 403
  const isNotFound = error.status === 404
  const title = isUnauthorized
    ? "Tu sesión ha caducado"
    : isForbidden
      ? "No tienes acceso a este catálogo"
      : isNotFound
        ? "No encontramos este equipo"
        : "No pudimos cargar el catálogo"
  const description = isUnauthorized
    ? "Inicia sesión de nuevo para continuar."
    : isForbidden
      ? "Vuelve a tus equipos para elegir una membresía disponible."
      : isNotFound
        ? "Comprueba el enlace o vuelve a tus equipos."
        : "Revisa la conexión e inténtalo otra vez."

  return (
    <TeamSurface role="alert" className="mt-4 max-w-xl border-[var(--lb-color-danger)]">
      <h2 className="team-display text-xl font-extrabold text-[var(--team-text)]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--team-muted)]">{description}</p>
      <div className="mt-5">
        {isUnauthorized ? (
          <CatalogStateLink href="/login">Iniciar sesión</CatalogStateLink>
        ) : isForbidden || isNotFound ? (
          <CatalogStateLink href="/equipos">Volver a mis equipos</CatalogStateLink>
        ) : (
          <button type="button" onClick={onRetry} className="min-h-11 rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--lb-color-accent-hover)]">
            Reintentar
          </button>
        )}
      </div>
    </TeamSurface>
  )
}

function CatalogStateLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="inline-flex min-h-11 items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white">{children}</Link>
}
