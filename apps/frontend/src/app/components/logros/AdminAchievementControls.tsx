"use client"

import { useEffect, useRef, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import { AchievementProgressDisplay } from "./AchievementProgressDisplay"
import type { AchievementProgress, TeamMember, VisibleAchievement } from "@/types/api"

const fieldClass = "mt-2 min-h-11 w-full rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] px-3 py-2 text-sm text-[var(--team-text)]"
const buttonClass = "min-h-11 rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"

export function AdminAchievementControls({ achievement, slug, onUpdate }: { achievement: VisibleAchievement; slug: string; onUpdate: () => void }) {
  const base = `/api/equipos/${encodeURIComponent(slug)}`
  const endpoint = `${base}/logros/${achievement.id}`
  const [members, setMembers] = useState<TeamMember[]>([])
  const [userId, setUserId] = useState("")
  const [delta, setDelta] = useState("")
  const [progress, setProgress] = useState<{ userId: string; value: AchievementProgress | null } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [revision, setRevision] = useState(0)
  const mutationPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    apiFetch<TeamMember[]>(`${base}/admin/miembros`, { signal: controller.signal }).then((value) => { if (!controller.signal.aborted) setMembers(value) }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar los miembros.") })
    return () => controller.abort()
  }, [base, revision])

  useEffect(() => {
    if (!userId || achievement.kind !== "PROGRESSIVE") return
    const controller = new AbortController()
    apiFetch<AchievementProgress | null>(`${endpoint}/progreso?userId=${encodeURIComponent(userId)}`, { signal: controller.signal }).then((value) => { if (!controller.signal.aborted) setProgress({ userId, value }) }).catch((cause) => { if (!controller.signal.aborted) setError(cause instanceof ApiError ? cause.message : "No se pudo cargar el progreso.") })
    return () => controller.abort()
  }, [achievement.kind, endpoint, userId, revision])

  async function mutate(action: "secret" | "progress" | "award") {
    if (mutationPending.current || (action === "progress" && !canEditProgress) || (action === "award" && !canAward)) return
    mutationPending.current = true
    setBusy(true); setError(""); setNotice("")
    try {
      if (action === "secret") await apiFetch(`${endpoint}/configuracion`, { method: "PATCH", body: JSON.stringify({ isSecret: !achievement.isSecret }) })
      if (action === "progress") {
        const value = await apiFetch<AchievementProgress>(`${endpoint}/progreso`, { method: "PATCH", body: JSON.stringify({ userId: Number(userId), delta: Number(delta) }) })
        setProgress({ userId, value }); setDelta("")
      }
      if (action === "award") {
        await apiFetch(`${base}/admin/asignaciones`, { method: "POST", body: JSON.stringify({ userId: Number(userId), logroId: achievement.id }) })
        setProgress(null)
      }
      setNotice(action === "secret" ? "Visibilidad actualizada." : action === "progress" ? "Progreso actualizado. La concesión sigue siendo manual." : "Logro concedido.")
      onUpdate(); setRevision((value) => value + 1)
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "No se pudo guardar el cambio.") }
    finally { mutationPending.current = false; setBusy(false) }
  }

  const selectedProgress = progress?.userId === userId ? progress.value : null
  const validDelta = delta.trim() !== "" && Number.isInteger(Number(delta)) && Number(delta) !== 0 && Math.abs(Number(delta)) <= 2147483647
  const counterClosed = selectedProgress?.status === "AWARDED"
  const canEditProgress = Boolean(userId && selectedProgress && validDelta && achievement.progressAvailable && !counterClosed)
  const canAward = Boolean(userId && achievement.progressAvailable && (achievement.kind !== "PROGRESSIVE" || selectedProgress?.status === "ELIGIBLE"))

  return <TeamSurface>
    <h2 className="team-display text-2xl font-extrabold">Administrar logro</h2>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-[var(--team-muted)]">{achievement.isSecret ? achievement.isRevealed ? "Secreto ya revelado a todo el equipo." : "Se revela a todo el equipo cuando cualquier miembro lo consigue." : "Visible para todos los miembros."}</p><button className={buttonClass} disabled={busy} onClick={() => mutate("secret")}>{achievement.isSecret ? "Hacer visible" : "Marcar como secreto"}</button></div>
    <div className="mt-6 border-t border-[var(--team-line)] pt-5">
      <label className="block text-sm font-semibold">Miembro<select className={fieldClass} value={userId} disabled={busy} onChange={(event) => { setUserId(event.target.value); setProgress(null); setError(""); setNotice("") }}><option value="">Selecciona un miembro</option>{members.map((member) => <option key={member.id} value={member.id}>{member.email}</option>)}</select></label>
      {achievement.kind === "PROGRESSIVE" ? <div className="mt-4">
        {userId && !selectedProgress && !error ? <p role="status" className="mb-3 text-sm">Cargando progreso…</p> : null}
        <AchievementProgressDisplay progress={selectedProgress} available={achievement.progressAvailable} />
        <label className="block text-sm font-semibold">Ajuste del contador<input className={fieldClass} type="number" step="1" min="-2147483647" max="2147483647" value={delta} disabled={busy || counterClosed || !selectedProgress || !achievement.progressAvailable} onChange={(event) => setDelta(event.target.value)} placeholder="Ej. 1 o -1" aria-describedby="progress-delta-help" /></label><p id="progress-delta-help" className="mt-2 text-xs leading-5 text-[var(--team-muted)]">{counterClosed ? "Logro concedido: el contador está cerrado y no admite cambios." : "Usa un entero positivo para sumar o negativo para corregir. El contador se limita entre cero y el objetivo. Tras concederlo, queda cerrado."}</p>
        <button className={`${buttonClass} mt-3`} disabled={busy || !canEditProgress} onClick={() => mutate("progress")}>Guardar progreso</button>
      </div> : null}
      {achievement.kind === "PROGRESSIVE" && selectedProgress && !counterClosed && selectedProgress.status !== "ELIGIBLE" ? <p className="mt-4 text-sm text-[var(--team-muted)]">El miembro debe alcanzar el objetivo antes de recibir el logro.</p> : null}
      <button className={`${buttonClass} mt-5`} disabled={busy || !canAward} onClick={() => mutate("award")}>Conceder logro manualmente</button>
    </div>
    {error ? <div className="mt-4"><p role="alert" className="text-sm text-[var(--lb-color-danger)]">{error}</p><button className="mt-2 min-h-11 text-sm underline" onClick={() => { setError(""); setProgress(null); setRevision((value) => value + 1) }}>Recargar miembros y progreso</button></div> : null}
    {notice ? <p role="status" className="mt-4 text-sm text-[var(--team-muted)]">{notice}</p> : null}
  </TeamSurface>
}
