"use client"

import Link from "next/link"
import { FormEvent, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"

export default function SolicitarAccesoPage() {
  const [teamName, setTeamName] = useState("")
  const [officialEmail, setOfficialEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setSaving(true)

    try {
      await apiFetch("/api/equipos/solicitudes", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ teamName, officialEmail, message }),
      })
      setSent(true)
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "Inicia sesión para enviar la solicitud."
          : cause instanceof ApiError && cause.status === 409
            ? "Ya tienes una solicitud pendiente de revisión."
            : cause instanceof Error
              ? cause.message
              : "No se pudo enviar la solicitud.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="portal-shell">
      <div className="portal-grid">
        <section>
          <p className="portal-kicker">Nuevo equipo · 04</p>
          <h1 className="portal-title">Abre una sala para tu club.</h1>
          <p className="portal-copy">
            Revisaremos la identidad del equipo antes de activarlo. Incluye sus canales oficiales y cualquier dato que nos ayude a reconocerlo.
          </p>
          <div className="portal-notes">
            <span className="portal-note">revisión manual</span>
            <span className="portal-note">respuesta pendiente</span>
          </div>
        </section>

        <section className="portal-panel" aria-labelledby="request-heading">
          {sent ? (
            <div role="status">
              <p className="portal-kicker">Solicitud recibida</p>
              <h2 id="request-heading" className="portal-panel-heading mt-3">Queda pendiente de revisión.</h2>
              <p className="portal-panel-subtitle mt-3">Cuando se apruebe, el equipo aparecerá en tu panel y entrarás como administrador.</p>
              <Link href="/equipos" className="portal-submit">Volver a mis equipos</Link>
            </div>
          ) : (
            <>
              <h2 id="request-heading" className="portal-panel-heading">Solicitar un equipo</h2>
              <p className="portal-panel-subtitle">Todos los campos son obligatorios.</p>

              <form onSubmit={submit}>
                <label className="portal-field">
                  <span>Nombre oficial del club</span>
                  <input className="portal-input" name="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} minLength={3} maxLength={80} required placeholder="Club Deportivo Norte" />
                </label>

                <label className="portal-field">
                  <span>Correo oficial del club</span>
                  <input className="portal-input" name="officialEmail" type="email" value={officialEmail} onChange={(event) => setOfficialEmail(event.target.value)} maxLength={254} required placeholder="info@clubdeportivonorte.es" />
                </label>

                <label className="portal-field">
                  <span>Información para verificar el equipo</span>
                  <textarea className="portal-input min-h-36 resize-y" name="message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1500} required placeholder="Web oficial, perfiles en redes sociales, competición y otros datos públicos del club." />
                </label>

                {error && <p role="alert" className="portal-error">{error}</p>}
                <button className="portal-submit" type="submit" disabled={saving}>{saving ? "Enviando…" : "Enviar solicitud"}</button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
