"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { apiFetch, ApiError } from "@/lib/api"
import { Empty } from "@/app/components/ui/Empty"
import { ErrorMessage } from "@/app/components/ui/Error"
import { Status } from "@/app/components/ui/Status"
import type { AchievementRequest } from "@/types/api"

export default function SolicitudesPage() {
  const { slug } = useParams<{ slug: string }>()
  const [requests, setRequests] = useState<AchievementRequest[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    apiFetch<AchievementRequest[]>(`/api/equipos/${encodeURIComponent(slug)}/solicitudes`, { auth: true })
      .then(setRequests)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : "No se pudieron cargar tus solicitudes"))
  }, [slug])

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <p className="font-mono text-xs uppercase tracking-widest text-coral">Historial personal</p>
      <h1 className="mt-3 font-display text-4xl font-bold">Mis solicitudes</h1>
      <p className="mt-3 text-ink-soft">Consulta qué logros están pendientes y cuáles fueron revisados.</p>
      {error ? <div className="mt-8"><ErrorMessage>{error}</ErrorMessage></div> : null}
      {requests === null && !error ? <p className="mt-8" role="status">Cargando solicitudes…</p> : null}
      {requests?.length === 0 ? <div className="mt-8"><Empty title="Todavía no has solicitado logros">Entra en el catálogo y abre el logro que quieras reclamar.</Empty></div> : null}
      <div className="mt-8 space-y-4">
        {requests?.map((request) => <article key={request.id} className="rounded-2xl border border-ink/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-display text-xl font-bold">{request.logro.nombre}</h2><p className="mt-1 text-sm text-ink-soft">{request.logro.puntos} puntos · {new Date(request.createdAt).toLocaleDateString()}</p></div><Status tone={request.status === "ACCEPTED" ? "mint" : request.status === "REJECTED" ? "coral" : "gold"}>{request.status === "ACCEPTED" ? "Aprobada" : request.status === "REJECTED" ? "Rechazada" : "Pendiente"}</Status></div>
        </article>)}
      </div>
    </main>
  )
}
