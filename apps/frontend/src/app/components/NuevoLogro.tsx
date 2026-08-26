// 📚 Client Component: formulario protegido. Necesita localStorage (leer el token) y estado,
//    así que corre en el navegador.
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function NuevoLogro() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [puntos, setPuntos] = useState("")
  const [error, setError] = useState("")

  // 📚 useEffect con deps []: se ejecuta UNA vez, tras el primer render, YA en el navegador.
  //    Aquí es obligatorio para localStorage: durante el render en servidor no existe, así
  //    que lo leemos después, en el cliente. token empieza null y se rellena tras montar.
  useEffect(() => {
    const timeout = window.setTimeout(() => setToken(localStorage.getItem("token")), 0)
    return () => window.clearTimeout(timeout)
  }, [])

  // 📚 Sin token → mostramos enlace a login en vez del formulario (gating de UI por sesión).
  if (token === null) {
    return (
      <p className="text-sm text-gray-500">
        <Link href="/login" className="text-blue-600 hover:underline">
          Inicia sesión
        </Link>{" "}
        para añadir logros.
      </p>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      // 📚 Ruta relativa /api + cabecera "Authorization: Bearer <token>": así el backend
      //    (authMiddleware) sabe que la petición está autenticada. El input number llega
      //    como string → Number(puntos) lo convierte.
      const res = await fetch("/api/logros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ nombre, puntos: Number(puntos) }),
      })

      if (!res.ok) {
        setError("Error al crear el logro")
        return
      }

      setNombre("")
      setPuntos("")
      // 📚 router.refresh(): re-pide los datos del Server Component (la lista de logros) sin
      //    recargar toda la página, para que aparezca el logro recién creado.
      router.refresh()
    } catch (err) {
      setError("No se pudo conectar con el servidor")
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border rounded-lg p-4">
      <h2 className="font-semibold text-lg">Nuevo logro</h2>

      <input
        type="text"
        placeholder="Nombre del logro"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="border rounded-lg p-2"
        required
      />
      <input
        type="number"
        placeholder="Puntos"
        value={puntos}
        onChange={(e) => setPuntos(e.target.value)}
        className="border rounded-lg p-2"
        required
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        type="submit"
        className="bg-blue-600 text-white rounded-lg p-2 font-medium hover:bg-blue-700 transition-colors"
      >
        Crear
      </button>
    </form>
  )
}
