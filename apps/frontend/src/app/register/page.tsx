// 📚 Client Component (igual que login): corre en el navegador porque usa estado y eventos.
"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AuthError, AuthField, AuthFormHeader, AuthSubmitButton, PasswordField } from "@/app/components/auth/AuthFields"
import { AuthLayout } from "@/app/components/auth/AuthLayout"
import { apiFetch, ApiError } from "@/lib/api"
import type { RegisterResponse } from "@/types/api"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.")
      return
    }

    if (submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)

    try {
      await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      router.push("/login")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor")
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      ariaLabelledBy="register-heading"
      asideTitle={<>Únete a la<br />comunidad.</>}
      asideCopy="Los logros también se celebran en equipo."
      footer={<p>¿Ya tienes cuenta? <Link href="/login" className="font-semibold text-[var(--lb-color-accent-hover)] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lb-color-focus)]">Inicia sesión</Link></p>}
    >
      <AuthFormHeader id="register-heading" title="Crea tu cuenta" subtitle="Empieza a formar parte de LockerBoard." />

      <form onSubmit={handleSubmit} aria-busy={submitting}>
        <AuthField
            id="register-email"
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            inputMode="email"
            aria-describedby={error ? "register-error" : undefined}
            disabled={submitting}
            required
          />

        <PasswordField
            id="register-password"
            name="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Crea una contraseña"
            autoComplete="new-password"
            aria-describedby={error ? "register-error" : undefined}
            disabled={submitting}
            required
          />

        <PasswordField
            id="register-confirm-password"
            name="confirmPassword"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            aria-describedby={error ? "register-error" : undefined}
            disabled={submitting}
            required
          />

        {error ? <AuthError id="register-error">{error}</AuthError> : null}

        <AuthSubmitButton submitting={submitting} idleLabel="Crear cuenta" busyLabel="Creando cuenta…" />
      </form>
    </AuthLayout>
  )
}
