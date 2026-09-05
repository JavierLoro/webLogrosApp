"use client"

import Link from "next/link"
import { use, useEffect, useMemo, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import { Button } from "@/app/components/ui/Button"
import { Empty } from "@/app/components/ui/Empty"
import { ErrorMessage } from "@/app/components/ui/Error"
import { LoadingState } from "@/app/components/logros/LoadingState"
import { LogroCard } from "@/app/components/logros/LogroCard"
import type { Logro } from "@/types/api"

export default function LogrosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [logros, setLogros] = useState<Logro[] | null>(null)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("Todas")
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    let active = true
    apiFetch<Logro[]>(`/api/equipos/${encodeURIComponent(slug)}/logros`, { auth: true })
      .then((data) => { if (active) setLogros(data) })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause : new Error("No se pudieron cargar los logros.")) })
    return () => { active = false }
  }, [requestVersion, slug])

  const categories = useMemo(() => ["Todas", ...Array.from(new Set((logros ?? []).map((item) => item.categoria?.trim()).filter((item): item is string => Boolean(item)))).sort((a, b) => a.localeCompare(b))], [logros])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return (logros ?? []).filter((item) => {
      const searchable = `${item.nombre} ${item.descripcion ?? ""} ${item.categoria ?? ""}`.toLocaleLowerCase()
      return (!normalized || searchable.includes(normalized)) && (category === "Todas" || item.categoria?.trim() === category)
    })
  }, [category, logros, query])

  function retry() { setLogros(null); setError(null); setRequestVersion((version) => version + 1) }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase tracking-[.2em] text-[var(--team-muted)]">Catálogo del equipo</p><h1 className="team-display mt-3 max-w-xl text-4xl font-bold leading-[.95] tracking-[-.04em] sm:text-6xl">Los hitos que este equipo ha decidido celebrar.</h1><p className="mt-4 max-w-lg text-base leading-7 text-[var(--team-muted)]">Consulta qué significa cada logro, cuántos puntos vale y en qué categoría está.</p></div><Link className="inline-flex min-h-11 w-fit items-center rounded-xl bg-[var(--team-primary)] px-5 py-3 text-sm font-semibold text-[var(--team-on-primary)] transition-colors hover:bg-[var(--team-primary-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--team-primary)]" href={`/equipos/${slug}/logros/nuevo`}>+ Crear logro</Link></header>
      {logros === null && !error ? <LoadingState /> : error ? <div className="max-w-xl space-y-4"><ErrorMessage>{error instanceof ApiError && error.status === 401 ? "Necesitas iniciar sesión para continuar." : error instanceof ApiError && error.status === 403 ? "No perteneces a este equipo. Usa una invitación para unirte." : error instanceof ApiError && error.status === 404 ? "No encontramos este equipo o catálogo." : error.message}</ErrorMessage><Button variant="quiet" onClick={retry}>Reintentar</Button></div> : logros?.length === 0 ? <Empty title="Todavía no hay logros" action={<Link className="inline-flex rounded-xl bg-coral px-4 py-2.5 text-sm font-semibold text-white" href={`/equipos/${slug}/logros/nuevo`}>Crear el primer logro</Link>}>Crea el primero para empezar el catálogo del equipo.</Empty> : <>
        <section aria-label="Buscar y filtrar logros" className="team-surface space-y-4 p-4 sm:p-5"><label htmlFor="logros-search" className="sr-only">Buscar por nombre, descripción o categoría</label><input id="logros-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en la colección…" className="min-h-12 w-full rounded-xl border border-[var(--team-line)] bg-[var(--team-surface-low)] px-4 text-base text-[var(--team-text)] outline-none transition-shadow placeholder:text-[var(--team-muted)] focus-visible:ring-2 focus-visible:ring-[var(--team-primary)]" /><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por categoría">{categories.map((item) => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-10 shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--team-primary)] ${category === item ? "bg-[var(--team-primary)] text-[var(--team-on-primary)]" : "bg-[var(--team-surface-high)] text-[var(--team-muted)] hover:bg-[var(--team-surface-highest)]"}`}>{item}</button>)}</div></section>
        <div className="flex items-center justify-between gap-4"><p className="font-mono text-xs uppercase tracking-[.16em] text-[var(--team-muted)]">{filtered.length} {filtered.length === 1 ? "logro" : "logros"}</p>{(query || category !== "Todas") && <button type="button" className="text-sm font-semibold text-[var(--team-primary-soft)] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--team-primary)]" onClick={() => { setQuery(""); setCategory("Todas") }}>Limpiar filtros</button>}</div>
        {filtered.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((logro) => <LogroCard key={logro.id} logro={logro} slug={slug} />)}</div> : <Empty title="No hay coincidencias">Prueba con otro término o limpia los filtros para ver toda la colección.</Empty>}
      </>}
    </div>
  )
}
