// 📚 "use client": marca este archivo como CLIENT COMPONENT → se ejecuta en el navegador
//    del visitante. Necesario porque usa useState, eventos y localStorage, que no existen
//    en un Server Component (que corre en el servidor).
"use client"

import { useRef, useState } from "react"
import Link from "next/link"
// 📚 useRouter (de next/navigation): permite navegar por código desde un Client Component.
import { useRouter } from "next/navigation"
import { AuthError, AuthField, AuthFormHeader, AuthSubmitButton, PasswordField } from "@/app/components/auth/AuthFields"
import { AuthLayout } from "@/app/components/auth/AuthLayout"
import { apiFetch, ApiError } from "@/lib/api"
import type { LoginResponse } from "@/types/api"

export default function LoginPage() {
  const router = useRouter()
  // 📚 useState: React re-renderiza el componente cuando cambian estos valores. Cada input
  //    es "controlado": su value viene del estado y onChange lo actualiza.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  async function handleSubmit(e: React.FormEvent) {
    // 📚 preventDefault evita que el form recargue la página (comportamiento HTML por defecto).
    e.preventDefault()
    if (submittingRef.current) return

    submittingRef.current = true
    setError("")
    setSubmitting(true)

    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem("teams", JSON.stringify(data.teams))
      localStorage.setItem("isSuperAdmin", JSON.stringify(data.isSuperAdmin))
      window.dispatchEvent(new Event("auth-change"))
      router.push(data.teams.length === 1 ? `/equipos/${data.teams[0].slug}` : "/equipos")
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo conectar con el servidor")
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      ariaLabelledBy="login-heading"
      asideTitle={<>Mismo deporte.<br />Más logros.</>}
      asideCopy="Tu equipo, sus hitos y todo lo que habéis conseguido juntos."
      footer={<p>¿Aún no tienes cuenta? <Link href="/register" className="font-semibold text-[var(--lb-color-accent-hover)] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lb-color-focus)]">Regístrate</Link></p>}
    >
      <AuthFormHeader id="login-heading" title="Bienvenido de nuevo" subtitle="Entra en tu equipo y sigue sumando." />

      <form onSubmit={handleSubmit} aria-busy={submitting}>
        <AuthField
            id="login-email"
            name="email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            inputMode="email"
            aria-describedby={error ? "login-error" : undefined}
            disabled={submitting}
            required
          />

        <PasswordField
            id="login-password"
            name="password"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            autoComplete="current-password"
            aria-describedby={error ? "login-error" : undefined}
            disabled={submitting}
            required
          />

        {error ? <AuthError id="login-error">{error}</AuthError> : null}

        <AuthSubmitButton submitting={submitting} idleLabel="Entrar" busyLabel="Entrando…" />
      </form>
    </AuthLayout>
  )
}
