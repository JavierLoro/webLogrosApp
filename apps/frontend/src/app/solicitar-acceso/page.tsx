"use client"

import Link from "next/link"
import { type FormEvent, useRef, useState } from "react"
import { AuthError, AuthField, AuthFormHeader, AuthSubmitButton, AuthTextArea } from "@/app/components/auth/AuthFields"
import { AuthLayout } from "@/app/components/auth/AuthLayout"
import { OnboardingSessionActions } from "@/app/components/onboarding/OnboardingHeader"
import { ApiError, apiFetch } from "@/lib/api"

export default function SolicitarAccesoPage() {
  const [teamName, setTeamName] = useState("")
  const [officialEmail, setOfficialEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return

    savingRef.current = true
    setError("")
    setErrorStatus(null)
    setSaving(true)

    try {
      await apiFetch("/api/equipos/solicitudes", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ teamName, officialEmail, message }),
      })
      setSent(true)
    } catch (cause: unknown) {
      setErrorStatus(cause instanceof ApiError ? cause.status : 500)
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
      savingRef.current = false
      setSaving(false)
    }
  }

  if (sent) return <RequestSuccess />

  return (
    <AuthLayout
      ariaLabelledBy="request-heading"
      asideTitle={<>Nuevos equipos. Más posibilidades.</>}
      asideCopy="Cuéntanos quiénes sois y revisaremos la solicitud antes de crear el espacio."
      asideVariant="lower"
      actions={<OnboardingSessionActions />}
      footer={<Link href="/equipos" className="font-semibold text-[var(--lb-color-accent-hover)] underline decoration-transparent underline-offset-4 hover:decoration-current">Volver a mis equipos</Link>}
    >
      <AuthFormHeader id="request-heading" title="Solicitar un nuevo equipo" subtitle="Cuéntanos un poco sobre tu equipo. Revisaremos la solicitud." />

      <form onSubmit={submit} aria-busy={saving}>
        <AuthField
          id="request-team-name"
          name="teamName"
          label="Nombre del equipo"
          value={teamName}
          onChange={(event) => setTeamName(event.target.value)}
          minLength={3}
          maxLength={80}
          placeholder="Nombre oficial del equipo"
          autoComplete="organization"
          aria-describedby={error ? "request-error" : undefined}
          disabled={saving}
          required
        />

        <AuthField
          id="request-official-email"
          name="officialEmail"
          label="Correo oficial del equipo"
          type="email"
          value={officialEmail}
          onChange={(event) => setOfficialEmail(event.target.value)}
          maxLength={254}
          placeholder="contacto@equipo.es"
          autoComplete="email"
          inputMode="email"
          aria-describedby={error ? "request-error" : undefined}
          disabled={saving}
          required
        />

        <AuthTextArea
          id="request-message"
          name="message"
          label="Información para verificar el equipo"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={1500}
          placeholder="Web oficial, redes, competición u otros datos que ayuden a identificar al equipo."
          aria-describedby={error ? "request-error" : undefined}
          disabled={saving}
          required
        />

        {error ? (
          <div>
            <AuthError id="request-error">{error}</AuthError>
            {errorStatus === 401 ? <Link href="/login" className="mt-3 inline-flex text-sm font-semibold text-[var(--lb-color-accent-hover)] underline underline-offset-4">Iniciar sesión</Link> : null}
          </div>
        ) : null}

        <AuthSubmitButton submitting={saving} idleLabel="Enviar solicitud" busyLabel="Enviando…" />
      </form>
    </AuthLayout>
  )
}

function RequestSuccess() {
  return (
    <AuthLayout
      ariaLabelledBy="request-success-heading"
      asidePosition="right"
      asideTitle={<>Las grandes historias empiezan con un primer paso.</>}
      asideCopy="Tu solicitud ya está registrada para revisión."
      asideVariant="lower"
      actions={<OnboardingSessionActions />}
    >
      <div role="status" className="text-center">
        <span aria-hidden="true" className="mx-auto grid size-20 place-items-center rounded-full border border-[var(--lb-color-border-strong)] bg-[var(--lb-color-surface-raised)] text-3xl font-black text-[var(--lb-color-success)]">✓</span>
        <h1 id="request-success-heading" className="mt-6 [font-family:var(--lb-font-display)] text-[clamp(2rem,4vw,2.75rem)] font-extrabold leading-none tracking-[-0.04em] text-[var(--lb-color-text-primary)]">¡Solicitud enviada!</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--lb-color-text-secondary)]">Hemos recibido la solicitud. Queda pendiente de revisión.</p>

        <section className="mt-7 rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-border)] bg-[var(--lb-color-surface-raised)] p-4 text-left" aria-labelledby="request-next-title">
          <h2 id="request-next-title" className="text-sm font-semibold text-[var(--lb-color-text-primary)]">¿Qué ocurre ahora?</h2>
          <ol className="mt-4 space-y-4">
            <SuccessStep number="1" title="Revisamos tu solicitud">El equipo de la plataforma revisará los datos enviados.</SuccessStep>
            <SuccessStep number="2" title="Resolución">La solicitud puede aprobarse o rechazarse tras la revisión.</SuccessStep>
            <SuccessStep number="3" title="Acceso al equipo">Si se aprueba, podrás acceder al espacio de tu equipo.</SuccessStep>
          </ol>
        </section>

        <Link href="/equipos" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]">Volver a mis equipos</Link>
      </div>
    </AuthLayout>
  )
}

function SuccessStep({ number, title, children }: { number: string; title: string; children: string }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--lb-color-text-primary)] [font-family:var(--lb-font-data)] text-xs font-semibold text-[var(--lb-color-bg-deep)]">{number}</span>
      <div>
        <p className="text-sm font-semibold text-[var(--lb-color-text-primary)]">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--lb-color-text-secondary)]">{children}</p>
      </div>
    </li>
  )
}
