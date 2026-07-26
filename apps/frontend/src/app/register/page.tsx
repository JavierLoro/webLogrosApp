// 📚 Client Component (igual que login): corre en el navegador porque usa estado y eventos.
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      // 📚 Ruta relativa /api (ver login/page.tsx). No hardcodear localhost:3001.
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        // 📚 Leemos el JSON de error del backend para mostrar su mensaje concreto
        //    (p.ej. "El email ya está registrado") con fallback si no viniera.
        const data = await res.json()
        setError(data.error ?? "Error al registrarse")
        return
      }

      // 📚 Tras registrar, redirigimos a /login (no guardamos sesión en el registro).
      router.push("/login")
    } catch (err) {
      setError("No se pudo conectar con el servidor")
      console.error(err)
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Crear cuenta</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg p-2"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border rounded-lg p-2"
            required
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          className="bg-blue-600 text-white rounded-lg p-2 font-medium hover:bg-blue-700 transition-colors"
        >
          Registrarse
        </button>
      </form>
    </main>
  )
}
