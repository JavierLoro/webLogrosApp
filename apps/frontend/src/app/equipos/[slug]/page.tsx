"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { TeamCatalogPulse } from "@/app/components/dashboard/TeamCatalogPulse"
import { TeamCatalogSelection } from "@/app/components/dashboard/TeamCatalogSelection"
import { TeamQuickStats } from "@/app/components/dashboard/TeamQuickStats"
import { Button } from "@/app/components/ui/Button"
import { Empty } from "@/app/components/ui/Empty"
import { ErrorMessage } from "@/app/components/ui/Error"
import { Skeleton } from "@/app/components/ui/Skeleton"
import { ApiError, apiFetch } from "@/lib/api"
import type { Logro } from "@/types/api"

export default function TeamDashboardPage() {
  const { slug } = useParams<{ slug: string }>()
  const [achievements, setAchievements] = useState<Logro[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true

    apiFetch<Logro[]>(`/api/equipos/${encodeURIComponent(slug)}/logros`, { auth: true })
      .then((data) => {
        if (active) setAchievements(data)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof ApiError ? cause : new ApiError("Error desconocido", 500))
      })

    return () => {
      active = false
    }
  }, [requestVersion, slug])

  const summary = useMemo(() => {
    const items = achievements ?? []
    const categories = new Set(
      items.map((item) => item.categoria?.trim()).filter((category): category is string => Boolean(category)),
    )

    return {
      total: items.length,
      points: items.reduce((sum, item) => sum + item.puntos, 0),
      categories: categories.size,
    }
  }, [achievements])

  const teamName = slug.replace(/-/g, " ")
  const notFound = error?.status === 404

  function retry() {
    setAchievements(null)
    setError(null)
    setRequestVersion((version) => version + 1)
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-7 flex flex-col justify-between gap-5 border-b border-[var(--team-outline)] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="team-eyebrow">Panel del equipo</p>
          <h1 className="team-display mt-2 text-4xl font-black leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Catálogo de <span className="text-[var(--team-primary)]">{teamName}</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--team-muted)] sm:text-base">
            Los logros que este equipo ha decidido celebrar, reunidos en una sola sala.
          </p>
        </div>
        <Link
          href={`/equipos/${slug}/logros`}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--team-primary)] px-5 py-2.5 text-sm font-bold text-[var(--team-on-primary)] hover:-translate-y-0.5 hover:bg-[var(--team-primary-soft)]"
        >
          Ver catálogo completo <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </header>

      {error ? (
        <div className="max-w-2xl space-y-4">
          <ErrorMessage>
            {notFound
              ? "No encontramos este equipo. Comprueba el enlace o vuelve a tus equipos."
              : error.status === 401
                ? "Tu sesión ha caducado. Inicia sesión para volver a entrar."
                : error.status === 403
                  ? "No perteneces a este equipo. Usa una invitación para unirte."
                  : "No pudimos cargar el catálogo del equipo. Inténtalo de nuevo."}
          </ErrorMessage>
          {!notFound && <Button variant="quiet" onClick={retry}>Reintentar</Button>}
        </div>
      ) : achievements === null ? (
        <DashboardSkeleton />
      ) : achievements.length === 0 ? (
        <Empty
          title="Haz sitio al primer logro"
          action={
            <Link
              href={`/equipos/${slug}/logros/nuevo`}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--team-primary)] px-5 py-2.5 text-sm font-bold text-[var(--team-on-primary)]"
            >
              Crear el primer logro
            </Link>
          }
        >
          Crea el primer logro para empezar el catálogo de este equipo.
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8"><TeamCatalogPulse total={summary.total} /></div>
          <div className="xl:col-span-4"><TeamQuickStats {...summary} /></div>
          <div className="xl:col-span-8"><TeamCatalogSelection achievements={achievements.slice(0, 3)} slug={slug} /></div>
          <aside className="team-surface flex min-h-64 flex-col justify-between overflow-hidden border-[color:color-mix(in_srgb,var(--team-primary)_35%,transparent)] p-6 xl:col-span-4 sm:p-8">
            <div>
              <p className="team-eyebrow text-[var(--team-orange)]">Siguiente paso</p>
              <h2 className="team-display mt-3 text-3xl font-extrabold leading-none">Haz crecer el catálogo</h2>
              <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">Revisa todos los logros o crea uno nuevo si administras este equipo.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="rounded-full bg-[var(--team-primary)] px-5 py-3 text-sm font-bold text-[var(--team-on-primary)]" href={`/equipos/${slug}/logros`}>Ver catálogo</Link>
              <Link className="rounded-full border border-[var(--team-outline-strong)] px-5 py-3 text-sm font-bold text-[var(--team-text)] hover:border-[var(--team-primary-soft)]" href={`/equipos/${slug}/logros/nuevo`}>Crear logro</Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div aria-label="Cargando panel del equipo" className="grid grid-cols-1 gap-5 xl:grid-cols-12">
      <Skeleton className="h-80 rounded-3xl xl:col-span-8" />
      <Skeleton className="h-80 rounded-3xl xl:col-span-4" />
      <Skeleton className="h-72 rounded-3xl xl:col-span-8" />
      <Skeleton className="h-72 rounded-3xl xl:col-span-4" />
    </div>
  )
}
