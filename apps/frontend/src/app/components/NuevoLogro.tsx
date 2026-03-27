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

  useEffect(() => {
    setToken(localStorage.getItem("token"))
  }, [])

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
      const res = await fetch("http://localhost:3001/logros", {
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
