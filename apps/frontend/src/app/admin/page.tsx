"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import type { PlatformTeam, TeamRequest } from "@/types/api"

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
})

export default function AdminPage() {
  const [requests, setRequests] = useState<TeamRequest[] | null>(null)
  const [teams, setTeams] = useState<PlatformTeam[] | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let active = true

    Promise.all([
      apiFetch<TeamRequest[]>("/api/equipos/solicitudes", { auth: true }),
      apiFetch<PlatformTeam[]>("/api/equipos", { auth: true }),
    ])
      .then(([requestData, teamData]) => {
        if (!active) return
        setRequests(requestData)
        setTeams(teamData)
      })
      .catch((cause) => {
        if (!active) return
        setError(
          cause instanceof ApiError && cause.status === 403
            ? "Esta cuenta no tiene permisos de superadministración."
            : cause instanceof ApiError
              ? cause.message
              : "No se pudo cargar el panel de administración.",
        )
        setRequests([])
        setTeams([])
      })

    return () => {
      active = false
    }
  }, [])

  async function reviewRequest(request: TeamRequest, action: "aceptar" | "rechazar") {
    const accepted = action === "aceptar"
    const confirmation = accepted
      ? `¿Crear el equipo ${request.teamName} y convertir al solicitante en administrador?`
      : `¿Rechazar la solicitud de ${request.teamName}?`

    if (!window.confirm(confirmation)) return

    setProcessingId(request.id)
    setError("")
    setNotice("")

    try {
      await apiFetch(`/api/equipos/solicitudes/${request.id}/${action}`, {
        method: "POST",
        auth: true,
      })
      setRequests((current) => current?.filter((item) => item.id !== request.id) ?? [])
      if (accepted) {
        try {
          setTeams(await apiFetch<PlatformTeam[]>("/api/equipos", { auth: true }))
        } catch {
          setError("El equipo se creó, pero no se pudo actualizar la lista de equipos.")
        }
      }
      setNotice(accepted ? `Equipo ${request.teamName} creado.` : `Solicitud de ${request.teamName} rechazada.`)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "No se pudo procesar la solicitud.")
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <main className="teams-surface">
      <div className="teams-frame">
        <header className="teams-header">
          <div>
            <p className="portal-kicker">Control de plataforma · 05</p>
            <h1 className="teams-title">Administración</h1>
            <p className="teams-muted mt-4 max-w-xl">
              Supervisa los equipos activos y revisa las nuevas peticiones de acceso.
            </p>
          </div>
          {requests !== null && !error && (
            <p className="rounded-full border border-[rgba(173,136,131,.28)] px-4 py-2 font-mono text-xs uppercase tracking-wider text-[#d7aaa4]">
              {requests.length} {requests.length === 1 ? "pendiente" : "pendientes"}
            </p>
          )}
        </header>

        <div className="mt-8 space-y-4" aria-live="polite">
          {error && <p role="alert" className="portal-error">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-[#55e16b]/35 bg-[#55e16b]/10 px-4 py-3 text-sm text-[#9af0a8]">{notice}</p>}

          <section className="pt-4" aria-labelledby="active-teams-heading">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 id="active-teams-heading" className="font-[family-name:var(--font-anybody)] text-2xl font-extrabold uppercase tracking-[-.04em] text-[#e2e2e8]">Equipos activos</h2>
                <p className="teams-muted mt-1 text-sm">Espacios disponibles actualmente en LockerBoard.</p>
              </div>
              {teams !== null && <span className="font-mono text-xs uppercase tracking-wider text-[#d7aaa4]">{teams.length} total</span>}
            </div>

            {teams === null && !error ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-[1.25rem] bg-[#1a1c20]" />)}
              </div>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {teams?.map((team) => (
                  <Link key={team.id} href={`/equipos/${team.slug}`} className="group rounded-[1.25rem] border border-[rgba(173,136,131,.2)] bg-[linear-gradient(145deg,#1e2024,#111317)] p-5 hover:-translate-y-1 hover:border-[#ff5545]">
                    <p className="font-mono text-[.65rem] uppercase tracking-wider text-[#fe9400]">/{team.slug}</p>
                    <h3 className="mt-3 font-[family-name:var(--font-anybody)] text-xl font-extrabold uppercase tracking-[-.04em] text-[#ffb4aa]">{team.nombre}</h3>
                    <dl className="mt-6 flex gap-6 border-t border-[rgba(173,136,131,.18)] pt-4 text-sm">
                      <div><dt className="text-[#d7aaa4]">Miembros</dt><dd className="mt-1 text-lg font-bold text-[#e2e2e8]">{team._count.miembros}</dd></div>
                      <div><dt className="text-[#d7aaa4]">Logros</dt><dd className="mt-1 text-lg font-bold text-[#e2e2e8]">{team._count.logros}</dd></div>
                    </dl>
                  </Link>
                ))}
                {teams?.length === 0 && !error && <p className="teams-muted sm:col-span-2 lg:col-span-3">Todavía no hay equipos activos.</p>}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-2 pt-10 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-anybody)] text-2xl font-extrabold uppercase tracking-[-.04em] text-[#e2e2e8]">Solicitudes pendientes</h2>
              <p className="teams-muted mt-1 text-sm">Contrasta el correo y la presencia pública antes de decidir.</p>
            </div>
          </div>

          {requests === null && !error && [0, 1, 2].map((item) => (
            <div key={item} className="animate-pulse rounded-[1.25rem] border border-[rgba(173,136,131,.18)] bg-[#1a1c20] p-6">
              <div className="h-3 w-32 rounded bg-[#333539]" />
              <div className="mt-5 h-8 w-2/3 rounded bg-[#333539]" />
              <div className="mt-5 h-20 rounded bg-[#282a2e]" />
            </div>
          ))}

          {requests?.map((request) => {
            const processing = processingId === request.id

            return (
              <article key={request.id} className="rounded-[1.25rem] border border-[rgba(173,136,131,.2)] bg-[linear-gradient(145deg,#1e2024,#111317)] p-5 sm:p-6">
                <div className="flex flex-col gap-4 border-b border-[rgba(173,136,131,.18)] pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-mono text-[.68rem] uppercase tracking-[.14em] text-[#fe9400]">
                      Solicitud #{request.id} · {dateFormatter.format(new Date(request.createdAt))}
                    </p>
                    <h2 className="mt-2 font-[family-name:var(--font-anybody)] text-2xl font-extrabold uppercase tracking-[-.04em] text-[#ffb4aa] sm:text-3xl">
                      {request.teamName}
                    </h2>
                  </div>
                  <span className="w-fit rounded-full bg-[#fe9400]/15 px-3 py-1 font-mono text-[.65rem] uppercase tracking-wider text-[#ffbc7c]">
                    Pendiente
                  </span>
                </div>

                <dl className="grid gap-4 py-5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-mono text-[.65rem] uppercase tracking-wider text-[#d7aaa4]">Correo oficial</dt>
                    <dd className="mt-1 break-all">
                      <a className="text-[#e2e2e8] underline decoration-[#ff5545] underline-offset-4 hover:text-[#ffb4aa]" href={`mailto:${request.officialEmail}`}>
                        {request.officialEmail}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[.65rem] uppercase tracking-wider text-[#d7aaa4]">Cuenta solicitante</dt>
                    <dd className="mt-1 break-all text-[#e2e2e8]">{request.user.email}</dd>
                  </div>
                </dl>

                <section aria-labelledby={`request-message-${request.id}`} className="rounded-xl bg-[#0c0e12] p-4">
                  <h3 id={`request-message-${request.id}`} className="font-mono text-[.65rem] uppercase tracking-wider text-[#d7aaa4]">Información aportada</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#e2e2e8]">{request.message}</p>
                </section>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => reviewRequest(request, "rechazar")}
                    className="min-h-11 rounded-full border border-[rgba(255,180,170,.38)] px-5 text-sm font-bold text-[#ffb4aa] hover:border-[#ff5545] hover:bg-[#ff5545]/10 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? "Procesando…" : "Rechazar"}
                  </button>
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => reviewRequest(request, "aceptar")}
                    className="min-h-11 rounded-full bg-[#ff5545] px-5 text-sm font-extrabold text-[#410001] hover:bg-[#ffb4aa] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? "Procesando…" : "Aceptar y crear equipo"}
                  </button>
                </div>
              </article>
            )
          })}

          {requests?.length === 0 && !error && (
            <section className="portal-panel text-center">
              <p className="portal-kicker">Cola al día</p>
              <h2 className="portal-panel-heading mt-3">No hay solicitudes pendientes.</h2>
              <p className="portal-panel-subtitle mt-3">Las nuevas peticiones aparecerán aquí por orden de llegada.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
