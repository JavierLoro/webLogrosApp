// 📚 "use client": marca este archivo como CLIENT COMPONENT → se ejecuta en el navegador
//    del visitante. Necesario porque usa useState, eventos y localStorage, que no existen
//    en un Server Component (que corre en el servidor).
"use client"

import { useState } from "react"
// 📚 useRouter (de next/navigation): permite navegar por código desde un Client Component.
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  // 📚 useState: React re-renderiza el componente cuando cambian estos valores. Cada input
  //    es "controlado": su value viene del estado y onChange lo actualiza.
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    // 📚 preventDefault evita que el form recargue la página (comportamiento HTML por defecto).
    e.preventDefault()
    setError("")

    try {
      // 📚 RUTA RELATIVA "/api/...": este fetch corre en el navegador del visitante. Si
      //    apuntara a http://localhost:3001 sería el PC del visitante, no el backend.
      //    /api lo resuelve nginx (prod) o rewrites() de next.config (dev). Ver apuntes.
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        setError("Email o contraseña incorrectos")
        return
      }

      const data = await res.json()
      // 📚 localStorage (solo existe en el navegador): guarda el JWT para reenviarlo luego
      //    en "Authorization: Bearer" al crear logros.
      localStorage.setItem("token", data.token)
      router.push("/")
    } catch (err) {
      setError("No se pudo conectar con el servidor")
      console.error(err)
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Iniciar sesión</h1>

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
          Entrar
        </button>
      </form>
    </main>
  )
}
