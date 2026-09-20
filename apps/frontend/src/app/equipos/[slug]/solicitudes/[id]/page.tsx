"use client"

import Link from "next/link"
import { use, useEffect, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import { ErrorMessage } from "@/app/components/ui/Error"
import { Status } from "@/app/components/ui/Status"
import type { AchievementRequest } from "@/types/api"

export default function SolicitudDetallePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params)
  const [request, setRequest] = useState<AchievementRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    apiFetch<AchievementRequest[]>(`/api/equipos/${encodeURIComponent(slug)}/solicitudes`, { auth: true })
      .then((requests) => {
        if (!active) return
        const selected = requests.find((item) => String(item.id) === id)
        if (!selected) throw new Error("No se encontró esta solicitud en tu historial.")
        setRequest(selected)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : "No se pudo cargar la solicitud.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id, slug])

  const statusLabel = request?.status === "ACCEPTED" ? "Aprobada" : request?.status === "REJECTED" ? "Rechazada" : "Pendiente"
  const statusTone = request?.status === "ACCEPTED" ? "mint" : request?.status === "REJECTED" ? "coral" : "gold"

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-5 py-10">
      <Link className="font-mono text-xs uppercase tracking-widest text-coral" href={`/equipos/${slug}/solicitudes`}>
        ← Volver a mis solicitudes
      </Link>

      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-coral">Historial personal</p>
        <h1 className="mt-3 font-display text-4xl font-bold">Detalle de mi solicitud de obtención</h1>
      </header>

      {loading ? <p role="status">Cargando solicitud…</p> : null}
      {error ? <ErrorMessage>{error}</ErrorMessage> : null}

      {request ? (
        <article className="grid gap-6 rounded-3xl border border-paper-deep bg-white/70 p-6 md:grid-cols-[1fr_auto] md:p-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink-soft">Logro solicitado</p>
            <h2 className="mt-3 font-display text-3xl font-bold">{request.logro.nombre}</h2>
            {request.logro.descripcion ? <p className="mt-3 leading-7 text-ink-soft">{request.logro.descripcion}</p> : null}
            <p className="mt-6 text-sm text-ink-soft">
              Enviada el {new Date(request.createdAt).toLocaleString()} · {request.logro.puntos} puntos
            </p>
            {request.reviewedAt ? <p className="mt-2 text-sm text-ink-soft">Resuelta el {new Date(request.reviewedAt).toLocaleString()}</p> : null}
          </div>
          <div className="md:text-right">
            <Status tone={statusTone}>{statusLabel}</Status>
          </div>
        </article>
      ) : null}
    </div>
  )
}
