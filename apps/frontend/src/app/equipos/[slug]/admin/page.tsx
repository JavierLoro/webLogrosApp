"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api"

type Invitation = {
  id: number
  token: string | null
  expiresAt: string
  revokedAt: string | null
  maxUses: number
  uses: number
}

export default function TeamAdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const [link, setLink] = useState("")
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [error, setError] = useState("")

  async function loadInvitations() {
    const data = await apiFetch<Invitation[]>(`/api/equipos/${encodeURIComponent(slug)}/invitaciones`, { auth: true })
    setInvitations(data)
  }

  useEffect(() => {
    let active = true
    apiFetch<Invitation[]>(`/api/equipos/${encodeURIComponent(slug)}/invitaciones`, { auth: true })
      .then((data) => {
        if (active) setInvitations(data)
      })
      .catch((e) => {
        if (active) setError(e instanceof ApiError ? e.message : "No se pudieron cargar las invitaciones")
      })
    return () => {
      active = false
    }
  }, [slug])

  async function createInvitation() {
    try {
      const result = await apiFetch<{ token: string }>(`/api/equipos/${encodeURIComponent(slug)}/invitaciones`, { method: "POST", auth: true, body: JSON.stringify({ expiresInDays: 7, maxUses: 10 }) })
      setLink(`${window.location.origin}/unirse?token=${result.token}`)
      await loadInvitations()
    } catch (e) { setError(e instanceof ApiError ? e.message : "No se pudo crear la invitación") }
  }
  return <main className="mx-auto max-w-4xl px-5 py-12"><h1 className="font-display text-4xl font-bold">Administración del equipo</h1><p className="mt-3 text-ink-soft">Gestiona el acceso de nuevas personas a esta sala.</p><section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Invitar personas</h2><p className="mt-2 text-sm text-ink-soft">Genera un enlace válido durante siete días y con diez usos.</p><button onClick={createInvitation} className="mt-5 rounded-full bg-coral px-5 py-3 font-semibold text-white">Crear enlace de invitación</button>{link && <div className="mt-5"><label className="text-sm font-semibold" htmlFor="invite-link">Enlace para compartir</label><input id="invite-link" readOnly value={link} className="mt-2 w-full rounded-md border border-ink/20 bg-paper px-3 py-2" onFocus={(e) => e.currentTarget.select()} /></div>}{error && <p role="alert" className="mt-4 text-coral">{error}</p>}</section><section className="mt-8 rounded-2xl border border-ink/10 bg-white p-6"><h2 className="font-display text-2xl font-semibold">Invitaciones creadas</h2><div className="mt-5 space-y-4">{invitations.map((invitation) => { const invitationLink = invitation.token ? `${window.location.origin}/unirse?token=${invitation.token}` : ""; const unavailable = Boolean(invitation.revokedAt) || new Date(invitation.expiresAt) <= new Date() || invitation.uses >= invitation.maxUses; return <article key={invitation.id} className="rounded-xl border border-ink/10 p-4"><p className="text-sm text-ink-soft">{invitation.uses}/{invitation.maxUses} usos · caduca {new Date(invitation.expiresAt).toLocaleDateString()}</p>{invitationLink ? <><input aria-label="Enlace de invitación" readOnly value={invitationLink} className="mt-3 w-full rounded-md border border-ink/20 bg-paper px-3 py-2" onFocus={(e) => e.currentTarget.select()} /><button type="button" disabled={unavailable} onClick={() => navigator.clipboard.writeText(invitationLink)} className="mt-3 rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold disabled:opacity-50">Copiar enlace</button></> : <p className="mt-3 text-sm text-ink-soft">Esta invitación antigua no puede recuperarse; crea una nueva.</p>}</article> })}{invitations.length === 0 && <p className="text-sm text-ink-soft">Todavía no hay invitaciones.</p>}</div></section></main>
}
