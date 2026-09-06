"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api"
import { Button } from "@/app/components/ui/Button"
import { Empty } from "@/app/components/ui/Empty"
import type { AchievementRequest, Logro, TeamMember } from "@/types/api"

type Invitation = { id: number; token: string | null; expiresAt: string; revokedAt: string | null; maxUses: number; uses: number }

export default function TeamAdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [requests, setRequests] = useState<AchievementRequest[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [achievements, setAchievements] = useState<Logro[]>([])
  const [userId, setUserId] = useState("")
  const [logroId, setLogroId] = useState("")
  const [link, setLink] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  const load = useCallback(async () => {
    const base = `/api/equipos/${encodeURIComponent(slug)}`
    return Promise.all([
      apiFetch<Invitation[]>(`${base}/invitaciones`, { auth: true }),
      apiFetch<AchievementRequest[]>(`${base}/admin/solicitudes`, { auth: true }),
      apiFetch<TeamMember[]>(`${base}/admin/miembros`, { auth: true }),
      apiFetch<Logro[]>(`${base}/logros`, { auth: true }),
    ])
  }, [slug])

  const applyData = useCallback(([invitationData, requestData, memberData, achievementData]: Awaited<ReturnType<typeof load>>) => {
    setInvitations(invitationData); setRequests(requestData); setMembers(memberData); setAchievements(achievementData)
  }, [])

  useEffect(() => {
    let active = true
    load().then((data) => { if (active) applyData(data) }).catch((cause) => { if (active) setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el panel") })
    return () => { active = false }
  }, [applyData, load])

  async function review(id: number, action: "aceptar" | "rechazar") {
    setError("")
    try {
      await apiFetch(`/api/equipos/${encodeURIComponent(slug)}/admin/solicitudes/${id}/${action}`, { method: "POST", auth: true })
      setNotice(action === "aceptar" ? "Logro otorgado." : "Solicitud rechazada.")
      applyData(await load())
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo revisar la solicitud") }
  }

  async function assignDirectly() {
    setError("")
    try {
      await apiFetch(`/api/equipos/${encodeURIComponent(slug)}/admin/asignaciones`, { method: "POST", auth: true, body: JSON.stringify({ userId: Number(userId), logroId: Number(logroId) }) })
      setNotice("Logro asignado directamente."); setUserId(""); setLogroId("")
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo asignar el logro") }
  }

  async function createInvitation() {
    setError("")
    try {
      const result = await apiFetch<{ token: string }>(`/api/equipos/${encodeURIComponent(slug)}/invitaciones`, { method: "POST", auth: true, body: JSON.stringify({ expiresInDays: 7, maxUses: 10 }) })
      setLink(`${window.location.origin}/unirse?token=${result.token}`); setNotice("Invitación creada."); applyData(await load())
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo crear la invitación") }
  }

  return <main className="mx-auto max-w-4xl px-5 py-12">
    <p className="font-mono text-xs uppercase tracking-widest text-coral">TEAM_ADMIN</p><h1 className="mt-3 font-display text-4xl font-bold">Administración del equipo</h1><p className="mt-3 text-ink-soft">Revisa solicitudes, asigna logros y gestiona el acceso.</p>
    {error ? <p role="alert" className="mt-6 rounded-xl bg-[#fff0ed] p-4 text-coral-dark">{error}</p> : null}{notice ? <p role="status" className="mt-6 rounded-xl bg-mint p-4 text-ink">{notice}</p> : null}
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Solicitudes pendientes</h2><div className="mt-5 space-y-4">{requests.map((request) => <article key={request.id} className="rounded-xl border border-ink/10 p-4"><h3 className="font-display text-lg font-bold">{request.logro.nombre}</h3><p className="mt-1 text-sm text-ink-soft">{request.user?.email} · {request.logro.puntos} puntos</p><div className="mt-4 flex gap-3"><Button onClick={() => review(request.id, "aceptar")}>Aceptar</Button><Button variant="danger" onClick={() => review(request.id, "rechazar")}>Rechazar</Button></div></article>)}{requests.length === 0 ? <Empty title="No hay solicitudes pendientes" /> : null}</div></section>
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Asignar un logro</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold">Jugador<select value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-2 block w-full rounded-md border border-ink/20 bg-paper px-3 py-2"><option value="">Selecciona un jugador</option>{members.map((member) => <option key={member.id} value={member.id}>{member.email}</option>)}</select></label><label className="text-sm font-semibold">Logro<select value={logroId} onChange={(event) => setLogroId(event.target.value)} className="mt-2 block w-full rounded-md border border-ink/20 bg-paper px-3 py-2"><option value="">Selecciona un logro</option>{achievements.map((achievement) => <option key={achievement.id} value={achievement.id}>{achievement.nombre}</option>)}</select></label></div><Button className="mt-5" disabled={!userId || !logroId} onClick={assignDirectly}>Asignar logro</Button></section>
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Invitar personas</h2><p className="mt-2 text-sm text-ink-soft">Genera un enlace válido durante siete días y con diez usos.</p><Button className="mt-5" onClick={createInvitation}>Crear enlace de invitación</Button>{link ? <div className="mt-5"><label className="text-sm font-semibold" htmlFor="invite-link">Enlace para compartir</label><input id="invite-link" readOnly value={link} className="mt-2 w-full rounded-md border border-ink/20 bg-paper px-3 py-2" onFocus={(event) => event.currentTarget.select()} /></div> : null}</section>
    <section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Invitaciones creadas</h2><div className="mt-5 space-y-4">{invitations.map((invitation) => { const invitationLink = invitation.token ? `${window.location.origin}/unirse?token=${invitation.token}` : ""; const unavailable = Boolean(invitation.revokedAt) || new Date(invitation.expiresAt) <= new Date() || invitation.uses >= invitation.maxUses; return <article key={invitation.id} className="rounded-xl border border-ink/10 p-4"><p className="text-sm text-ink-soft">{invitation.uses}/{invitation.maxUses} usos · caduca {new Date(invitation.expiresAt).toLocaleDateString()}</p>{invitationLink ? <><input aria-label="Enlace de invitación" readOnly value={invitationLink} className="mt-3 w-full rounded-md border border-ink/20 bg-paper px-3 py-2" onFocus={(event) => event.currentTarget.select()} /><Button variant="quiet" className="mt-3" disabled={unavailable} onClick={() => navigator.clipboard.writeText(invitationLink)}>Copiar enlace</Button></> : <p className="mt-3 text-sm text-ink-soft">Esta invitación antigua no puede recuperarse; crea una nueva.</p>}</article> })}{invitations.length === 0 ? <p className="text-sm text-ink-soft">Todavía no hay invitaciones.</p> : null}</div></section>
  </main>
}
