"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { AuthError, AuthField, AuthFormHeader, AuthSubmitButton } from "@/app/components/auth/AuthFields"
import { AuthLayout } from "@/app/components/auth/AuthLayout"
import { OnboardingSessionActions } from "@/app/components/onboarding/OnboardingHeader"
import { ApiError, apiFetch } from "@/lib/api"
import type { TeamMembershipSummary } from "@/types/api"

type InvitationPreview = {
  team: {
    slug: string
    nombre: string
  }
  expiresAt: string
  remainingUses: number
}

type PreviewState = {
  token: string
  value: InvitationPreview
}

const expiryFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
})

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<JoinLoading />}>
      <JoinTeamContent />
    </Suspense>
  )
}

function JoinTeamContent() {
  const params = useSearchParams()
  const router = useRouter()
  const initialToken = params.get("token")?.trim() ?? ""
  const [token, setToken] = useState(initialToken)
  const [previewState, setPreviewState] = useState<PreviewState | null>(null)
  const [error, setError] = useState("")
  const [errorStatus, setErrorStatus] = useState<number | null>(null)
  const [checking, setChecking] = useState(false)
  const [joining, setJoining] = useState(false)
  const previewSequence = useRef(0)
  const previewController = useRef<AbortController | null>(null)
  const checkingRef = useRef(false)
  const joiningRef = useRef(false)

  const checkInvitation = useCallback(async (value: string) => {
    const cleanToken = value.trim()
    if (!cleanToken) {
      setPreviewState(null)
      setErrorStatus(null)
      setError("Introduce el código de la invitación.")
      return
    }
    if (checkingRef.current) return

    previewController.current?.abort()
    const controller = new AbortController()
    const requestId = previewSequence.current + 1
    previewSequence.current = requestId
    previewController.current = controller
    checkingRef.current = true
    setChecking(true)
    setPreviewState(null)
    setError("")
    setErrorStatus(null)

    try {
      const result = await apiFetch<InvitationPreview>(`/api/invitaciones/preview?token=${encodeURIComponent(cleanToken)}`, {
        signal: controller.signal,
      })
      if (requestId !== previewSequence.current) return
      setPreviewState({ token: cleanToken, value: result })
    } catch (cause: unknown) {
      if (cause instanceof DOMException && cause.name === "AbortError") return
      if (requestId !== previewSequence.current) return
      setErrorStatus(cause instanceof ApiError ? cause.status : 500)
      setError(cause instanceof ApiError ? cause.message : "No hemos podido comprobar esta invitación. Vuelve a intentarlo.")
    } finally {
      if (requestId === previewSequence.current) {
        checkingRef.current = false
        setChecking(false)
        previewController.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (initialToken) void checkInvitation(initialToken)

    return () => {
      previewSequence.current += 1
      previewController.current?.abort()
      checkingRef.current = false
    }
  }, [checkInvitation, initialToken])

  function changeToken(value: string) {
    previewSequence.current += 1
    previewController.current?.abort()
    previewController.current = null
    checkingRef.current = false
    setChecking(false)
    setToken(value)
    setPreviewState(null)
    setError("")
    setErrorStatus(null)
  }

  async function join() {
    const cleanToken = token.trim()
    if (!previewState || previewState.token !== cleanToken) {
      setErrorStatus(null)
      setError("Comprueba de nuevo la invitación antes de unirte.")
      return
    }
    if (joiningRef.current) return

    joiningRef.current = true
    setJoining(true)
    setError("")
    setErrorStatus(null)

    try {
      const result = await apiFetch<{ team: Omit<TeamMembershipSummary, "role">; role: TeamMembershipSummary["role"] }>("/api/invitaciones/join", {
        method: "POST",
        body: JSON.stringify({ token: cleanToken }),
      })
      router.push(`/equipos/${result.team.slug}`)
    } catch (cause: unknown) {
      setErrorStatus(cause instanceof ApiError ? cause.status : 500)
      setError(
        cause instanceof ApiError && cause.status === 401
          ? "Inicia sesión antes de usar esta invitación."
          : cause instanceof ApiError
            ? cause.message
            : "No hemos podido añadirte al equipo. Vuelve a intentarlo.",
      )
    } finally {
      joiningRef.current = false
      setJoining(false)
    }
  }

  return (
    <AuthLayout
      ariaLabelledBy="join-heading"
      asideTitle={<>La mejor parte del disco es con quién lo compartes.</>}
      asideCopy="Una invitación conecta tu cuenta con el espacio privado de tu equipo."
      asideVariant="lower"
      actions={<OnboardingSessionActions />}
      footer={<Link href="/equipos" className="font-semibold text-[var(--lb-color-accent-hover)] underline decoration-transparent underline-offset-4 hover:decoration-current">Volver a mis equipos</Link>}
    >
      <AuthFormHeader id="join-heading" title="Unirse a un equipo" subtitle="Introduce tu código de invitación para comprobar el equipo antes de unirte." />

      <form onSubmit={(event) => { event.preventDefault(); void checkInvitation(token) }} aria-busy={checking}>
        <AuthField
          id="invitation-token"
          name="token"
          label="Código de invitación"
          value={token}
          onChange={(event) => changeToken(event.target.value)}
          placeholder="Código de invitación"
          autoComplete="off"
          aria-describedby={error ? "invitation-error" : undefined}
          disabled={joining}
          required
        />

        {!previewState ? <AuthSubmitButton submitting={checking} idleLabel="Ver invitación" busyLabel="Comprobando…" /> : null}
      </form>

      {previewState ? (
        <section className="mt-5 rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-border-strong)] bg-[var(--lb-color-surface-raised)] p-4" aria-labelledby="invitation-team-title">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--lb-color-accent-hover)] uppercase">Invitación válida</p>
          <h2 id="invitation-team-title" className="mt-1 [font-family:var(--lb-font-display)] text-2xl font-bold text-[var(--lb-color-text-primary)]">{previewState.value.team.nombre}</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--lb-color-text-secondary)]">
            {previewState.value.remainingUses} {previewState.value.remainingUses === 1 ? "uso disponible" : "usos disponibles"}
            {formatExpiry(previewState.value.expiresAt) ? <> · válida hasta {formatExpiry(previewState.value.expiresAt)}</> : null}
          </p>
          <button
            type="button"
            onClick={() => void join()}
            disabled={joining}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] disabled:cursor-not-allowed disabled:opacity-65"
          >
            {joining ? "Uniéndome…" : `Unirme a ${previewState.value.team.nombre}`}
          </button>
        </section>
      ) : null}

      {error ? (
        <div>
          <AuthError id="invitation-error">{error}</AuthError>
          {errorStatus === 401 ? <Link href="/login" className="mt-3 inline-flex text-sm font-semibold text-[var(--lb-color-accent-hover)] underline underline-offset-4">Iniciar sesión</Link> : null}
        </div>
      ) : null}

      <aside className="mt-6 rounded-[var(--lb-radius-panel)] border border-[var(--lb-color-border)] bg-[var(--lb-color-surface-base)] p-4" aria-labelledby="invitation-help-title">
        <h2 id="invitation-help-title" className="text-sm font-semibold text-[var(--lb-color-text-primary)]">¿Dónde encuentro mi código?</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--lb-color-text-secondary)]">Te lo proporcionará un administrador del equipo. Puedes pegar aquí el token recibido o abrir directamente su enlace.</p>
      </aside>
    </AuthLayout>
  )
}

function JoinLoading() {
  return (
    <AuthLayout
      ariaLabelledBy="join-loading-title"
      asideTitle="Compartir equipo. Multiplicar logros."
      asideVariant="lower"
      actions={<OnboardingSessionActions />}
    >
      <div role="status" aria-live="polite" className="animate-pulse">
        <h1 id="join-loading-title" className="sr-only">Preparando la invitación</h1>
        <div className="h-8 w-56 rounded bg-[var(--lb-color-surface-strong)]" />
        <div className="mt-3 h-4 w-full rounded bg-[var(--lb-color-surface-raised)]" />
        <div className="mt-8 h-12 w-full rounded bg-[var(--lb-color-surface-strong)]" />
        <span className="sr-only">Preparando la invitación…</span>
      </div>
    </AuthLayout>
  )
}

function formatExpiry(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : expiryFormatter.format(date)
}
