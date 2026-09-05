// 📚 Client Component (igual que login): corre en el navegador porque usa estado y eventos.
"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api"
import type { RegisterResponse } from "@/types/api"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
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
      setSubmitting(false)
    }
  }

  return (
    <main className="portal-shell">
      <div className="portal-grid">
        <div>
          <p className="portal-kicker">Cuenta de miembro · 02</p>
          <h1 className="portal-title">Tu acceso empieza aquí.</h1>
          <p className="portal-copy">Regístrate para abrir invitaciones, unirte a tu equipo y consultar los logros que comparte.</p>
          <div className="portal-notes"><span className="portal-note">cuenta personal</span><span className="portal-note">acceso por invitación</span></div>
        </div>
        <section className="portal-panel" aria-labelledby="register-heading">
          <h2 id="register-heading" className="portal-panel-heading">Crear cuenta</h2>
          <p className="portal-panel-subtitle">Necesitarás un enlace de invitación para entrar en una sala.</p>

      <form onSubmit={handleSubmit}>
        <label className="portal-field"><span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="portal-input"
            required
          /></label>

        <label className="portal-field"><span>Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="portal-input"
            required
          /></label>

        {error && <p role="alert" className="portal-error">{error}</p>}

        <button
          type="submit"
          className="portal-submit"
          disabled={submitting}
        >
          {submitting ? "Creando cuenta…" : "Crear mi cuenta"}
        </button>
      </form>
          <p className="portal-foot">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
        </section>
      </div>
    </main>
  )
}
