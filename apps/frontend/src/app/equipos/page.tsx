"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import type { TeamSummary } from "@/types/api"

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [error, setError] = useState("")
  useEffect(() => { apiFetch<TeamSummary[]>("/api/equipos/mis-equipos", { auth: true }).then(setTeams).catch((e) => setError(e instanceof ApiError ? e.message : "No se pudieron cargar tus equipos")) }, [])
  return <main className="teams-surface"><div className="teams-frame"><header className="teams-header"><div><p className="portal-kicker">Tus espacios · 03</p><h1 className="teams-title">Mis equipos</h1><p className="teams-muted mt-4 max-w-lg">Entra en una sala, usa una invitación o solicita el espacio oficial de tu club.</p></div><div className="flex flex-wrap gap-3"><Link href="/unirse" className="teams-action">Unirme a un equipo ↗</Link><Link href="/solicitar-acceso" className="teams-action">Solicitar nuevo equipo ↗</Link></div></header>{error && <p role="alert" className="portal-error mt-6">{error}</p>}<div className="teams-grid">{teams.map((team) => <Link key={team.slug} href={`/equipos/${team.slug}`} className="teams-card"><span className="teams-card-role">{team.role}</span><h2 className="teams-card-name">{team.nombre}</h2><span className="teams-card-arrow" aria-hidden="true">↗</span></Link>)}{!error && teams.length === 0 && <div className="portal-panel col-span-full"><p className="teams-muted">Aún no perteneces a ningún equipo. Puedes entrar con una invitación o solicitar uno nuevo.</p><div className="mt-5 flex flex-wrap gap-3"><Link href="/unirse" className="teams-action">Usar una invitación ↗</Link><Link href="/solicitar-acceso" className="teams-action">Solicitar nuevo equipo ↗</Link></div></div>}</div></div></main>
}
