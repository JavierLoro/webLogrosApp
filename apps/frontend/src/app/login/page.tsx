// 📚 "use client": marca este archivo como CLIENT COMPONENT → se ejecuta en el navegador
//    del visitante. Necesario porque usa useState, eventos y localStorage, que no existen
//    en un Server Component (que corre en el servidor).
"use client"

import { useState } from "react"
import Link from "next/link"
// 📚 useRouter (de next/navigation): permite navegar por código desde un Client Component.
import { useRouter } from "next/navigation"
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

  async function handleSubmit(e: React.FormEvent) {
    // 📚 preventDefault evita que el form recargue la página (comportamiento HTML por defecto).
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem("token", data.token)
      localStorage.setItem("teams", JSON.stringify(data.teams))
      localStorage.setItem("isSuperAdmin", JSON.stringify(data.isSuperAdmin))
      window.dispatchEvent(new Event("auth-change"))
      router.push(data.teams.length === 1 ? `/equipos/${data.teams[0].slug}` : "/equipos")
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
          <p className="portal-kicker">Acceso de miembros · 01</p>
          <h1 className="portal-title">Vuelve a tu equipo.</h1>
          <p className="portal-copy">Inicia sesión para abrir las salas a las que perteneces y consultar sus catálogos de logros.</p>
          <div className="portal-notes"><span className="portal-note">una cuenta</span><span className="portal-note">todas tus salas</span></div>
        </div>
        <section className="portal-panel" aria-labelledby="login-heading">
          <h2 id="login-heading" className="portal-panel-heading">Iniciar sesión</h2>
          <p className="portal-panel-subtitle">Usa el email y la contraseña con los que te registraste.</p>

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
          {submitting ? "Entrando…" : "Ver mis equipos"}
        </button>
      </form>
          <p className="portal-foot">¿Primera vez aquí? <Link href="/register">Crea tu cuenta</Link></p>
        </section>
      </div>
    </main>
  )
}
