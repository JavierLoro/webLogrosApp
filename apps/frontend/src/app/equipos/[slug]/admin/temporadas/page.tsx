"use client"

import Link from "next/link"
import { useRef, useState, type FormEvent } from "react"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import { apiFetch, ApiError } from "@/lib/api"
import type { Season } from "@/types/api"
import { Heading, ReadState, useAdminPaths, useAdminRead, action, quiet, field } from "../AdminUI"

const calendarDate = (value: string) => new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value))
const labels: Record<Season["status"], string> = { PLANNED: "Planificada", ACTIVE: "Activa", CLOSED: "Cerrada" }
export default function SeasonsPage() {
  const { api } = useAdminPaths()
  return <Seasons key={api} api={api} />
}
function Seasons({ api }: { api: string }) {
  const seasons = useAdminRead<Season[]>(api + "/temporadas")
  const [name, setName] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [message, setMessage] = useState("")
  const [confirmation, setConfirmation] = useState<{ season: Season; mode: "activar" | "cerrar" } | null>(null)
  const lock = useRef(false)
  const active = seasons.data?.find(season => season.status === "ACTIVE")

  async function mutate(path: string, body?: unknown) {
    if (lock.current) return false
    lock.current = true; setBusy(true); setError(null); setMessage("")
    try {
      await apiFetch<Season>(api + path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) })
      seasons.reload()
      return true
    } catch (cause) {
      const failure = cause instanceof ApiError ? cause : new ApiError("No se pudo guardar. Inténtalo de nuevo.", 500)
      setError(failure)
      if (failure.status === 409 || failure.status === 404) { seasons.reload(); setConfirmation(null) }
      return false
    } finally { lock.current = false; setBusy(false) }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!Number.isFinite(new Date(startsAt).getTime()) || !Number.isFinite(new Date(endsAt).getTime())) { setError(new ApiError("Introduce fechas válidas de inicio y fin.", 400)); return }
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) { setError(new ApiError("La fecha de fin debe ser posterior al inicio.", 400)); return }
    if (await mutate("/admin/temporadas", { name: name.trim(), startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() })) {
      setName(""); setStartsAt(""); setEndsAt(""); setMessage("Temporada creada como planificada.")
    }
  }
  async function transition() {
    if (!confirmation) return
    if (await mutate(`/admin/temporadas/${confirmation.season.id}/${confirmation.mode}`)) {
      setMessage(confirmation.mode === "activar" ? "Temporada activada." : "Temporada cerrada.")
      setConfirmation(null)
    }
  }
  return <>
    <Heading title="Temporadas">Organiza los periodos del equipo y decide cuándo comienzan y terminan.</Heading>
    <p className="mb-5 max-w-3xl text-sm leading-6 text-[var(--team-muted)]">Las fechas son informativas: activar y cerrar son acciones manuales. Solo puede haber una temporada activa. Una temporada cerrada no se puede reactivar.</p>
    {error && <div role="alert" className="mb-4 rounded-md border border-[var(--lb-color-danger)] p-4 text-sm">{error.message}{error.status === 401 && <Link className={quiet + " ml-3"} href="/login">Iniciar sesión</Link>}</div>}
    <p role="status" className="mb-4 text-sm">{message}</p>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
      <TeamSurface className="min-w-0">
        <h2 className="team-display text-xl font-bold">Temporadas del equipo</h2>
        {!seasons.data ? <ReadState error={seasons.error} reload={seasons.reload} /> : seasons.data.length === 0 ? <p className="mt-5 text-sm text-[var(--team-muted)]">Todavía no hay temporadas. Crea la primera para planificar el próximo periodo.</p> : <ul className="mt-4 divide-y divide-[var(--team-line)]">{seasons.data.map(season => <li key={season.id} className="flex min-w-0 flex-wrap items-center justify-between gap-4 py-4">
          <div className="min-w-0 max-w-full"><h3 className="[overflow-wrap:anywhere] font-semibold">{season.name}</h3><p className="mt-1 text-sm text-[var(--team-muted)]">{calendarDate(season.startsAt)} — {calendarDate(season.endsAt)}</p><p className="mt-1 text-sm">{labels[season.status]}</p></div>
          {season.status !== "CLOSED" && <button className={quiet + " max-w-full [overflow-wrap:anywhere] whitespace-normal"} disabled={busy || confirmation !== null} onClick={() => { setError(null); setMessage(""); setConfirmation({ season, mode: season.status === "ACTIVE" ? "cerrar" : "activar" }) }}><span className="min-w-0 [overflow-wrap:anywhere]">{season.status === "ACTIVE" ? "Cerrar" : "Activar"} {season.name}</span></button>}
        </li>)}</ul>}
        {confirmation && <section aria-labelledby="season-confirmation" className="mt-4 min-w-0 max-w-full rounded-md border border-[var(--team-primary)] bg-[var(--team-surface-low)] p-4">
          <h3 id="season-confirmation" className="min-w-0 [overflow-wrap:anywhere] font-bold">{confirmation.mode === "activar" ? "Activar" : "Cerrar"} {confirmation.season.name}</h3>
          <p className="mt-2 min-w-0 [overflow-wrap:anywhere] text-sm leading-6 text-[var(--team-muted)]">{confirmation.mode === "activar" ? `La temporada seleccionada pasará a estar activa. ${active ? `Se cerrará la temporada activa (${active.name}).` : "Si hay una temporada activa al confirmar, se cerrará automáticamente."} Las temporadas cerradas no podrán reactivarse.` : "Esta temporada quedará cerrada y no podrá reactivarse. Sin una temporada activa, el ranking actual mostrará solo logros permanentes."}</p>
          <div className="mt-4 flex flex-wrap gap-2"><button className={action} disabled={busy || !seasons.data} onClick={transition}>{busy ? "Guardando…" : confirmation.mode === "activar" ? "Confirmar activación" : "Confirmar cierre"}</button><button className={quiet} disabled={busy} onClick={() => setConfirmation(null)}>Cancelar</button></div>
        </section>}
      </TeamSurface>
      <TeamSurface className="min-w-0"><h2 className="team-display text-xl font-bold">Crear temporada</h2><p className="mt-2 text-sm text-[var(--team-muted)]">Se guardará como planificada hasta que la actives.</p>
        <form onSubmit={create} className="mt-5"><fieldset disabled={busy} className="grid min-w-0 gap-4">
          <label className="min-w-0 text-sm" htmlFor="season-name">Nombre<input id="season-name" className={field} required maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="min-w-0 text-sm" htmlFor="season-start">Inicio<input id="season-start" type="date" className={field + " min-w-0"} required value={startsAt} onChange={event => setStartsAt(event.target.value)} /></label>
          <label className="min-w-0 text-sm" htmlFor="season-end">Fin<input id="season-end" type="date" className={field + " min-w-0"} required min={startsAt || undefined} value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label>
          <button className={action} disabled={!name.trim() || !startsAt || !endsAt || confirmation !== null}>{busy ? "Guardando…" : "Crear temporada"}</button>
        </fieldset></form>
      </TeamSurface>
    </div>
  </>
}
