"use client"

import Link from "next/link"
import { use, useEffect, useRef, useState } from "react"
import { apiFetch, ApiError } from "@/lib/api"
import { Button } from "@/app/components/ui/Button"
import { ErrorMessage } from "@/app/components/ui/Error"
import { LoadingState } from "@/app/components/logros/LoadingState"
import type { CatalogAchievement } from "@/types/api"
import { useTeamContext } from "@/app/components/team/TeamShell"
import { AchievementProgressDisplay } from "@/app/components/logros/AchievementProgressDisplay"
import { AdminAchievementControls } from "@/app/components/logros/AdminAchievementControls"

export default function LogroDetallePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params)
  return <AchievementDetail key={`${slug}/${id}`} slug={slug} id={id} />
}

function AchievementDetail({ slug, id }: { slug: string; id: string }) {
  const { me } = useTeamContext()
  const [logro, setLogro] = useState<CatalogAchievement | null>(null)
  const [error, setError] = useState<ApiError | Error | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)
  const [requesting, setRequesting] = useState(false)
  const [notice, setNotice] = useState("")
  const requestPending = useRef(false)
  const [requestSent, setRequestSent] = useState(false)

  useEffect(() => {
    let active = true

    apiFetch<CatalogAchievement>(`/api/equipos/${encodeURIComponent(slug)}/logros/${encodeURIComponent(id)}`)
      .then((data) => {
        if (active) setLogro(data)
      })
      .catch((cause: unknown) => {
        if (!active) return
        setError(cause instanceof Error ? cause : new Error("No se pudo cargar el logro."))
      })

    return () => {
      active = false
    }
  }, [id, requestVersion, slug])

  function retry() {
    setLogro(null)
    setError(null)
    setRequestVersion((version) => version + 1)
  }

  async function requestAchievement() {
    if (requestPending.current || requestSent || !logro || logro.isHidden || logro.earnedByMe || !logro.progressAvailable) return
    requestPending.current = true
    setRequesting(true)
    setNotice("")
    try {
      await apiFetch(`/api/equipos/${encodeURIComponent(slug)}/logros/${encodeURIComponent(id)}/solicitudes`, { method: "POST" })
      setNotice("Solicitud enviada. El administrador del equipo podrá revisarla.")
      setRequestSent(true)
    } catch (cause) {
      setNotice(cause instanceof ApiError ? cause.message : "No se pudo enviar la solicitud.")
    } finally {
      requestPending.current = false
      setRequesting(false)
    }
  }

  if (!logro && !error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10">
        <LoadingState />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      <Link
        className="font-mono text-xs uppercase tracking-widest text-coral"
        href={`/equipos/${slug}/logros`}
      >
        ← Volver al catálogo
      </Link>

      {error ? (
        <div className="space-y-4">
          <ErrorMessage>
            {error instanceof ApiError && error.status === 404
              ? "Este logro no existe en este equipo."
              : error instanceof ApiError && error.status === 401
                ? "Necesitas iniciar sesión para continuar."
                : error instanceof ApiError && error.status === 403
                  ? "No perteneces a este equipo. Usa una invitación para unirte."
                  : error.message}
          </ErrorMessage>
          <Button variant="quiet" onClick={retry}>Reintentar</Button>
        </div>
      ) : logro?.isHidden ? (
        <article className="rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] p-6"><h1 className="team-display text-3xl font-extrabold">Logro secreto</h1><p className="mt-4 text-[var(--team-muted)]">Sus detalles se revelarán cuando alguien del equipo lo consiga.</p></article>
      ) : logro ? (
        <>
        <article className="rounded-3xl border border-paper-deep bg-white/70 p-8">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-coral">Logro del equipo</p>
          <h1 className="mt-4 font-display text-4xl font-bold">{logro.nombre}</h1>
          {logro.descripcion ? <p className="mt-4 leading-7 text-ink-soft">{logro.descripcion}</p> : null}
          <div className="mt-10 border-t border-paper-deep pt-6">
            <strong className="font-mono text-5xl text-coral">{logro.puntos}</strong>
            <span className="ml-3 font-mono text-xs uppercase tracking-widest text-ink-soft">puntos</span>
          </div>
          {logro.kind === "PROGRESSIVE" ? <div className="mt-6"><h2 className="mb-3 font-semibold">Tu progreso</h2><AchievementProgressDisplay progress={logro.progress} available={logro.progressAvailable} /></div> : null}
          {logro.kind === "PROGRESSIVE" && !logro.earnedByMe ? <p className="mt-3 text-sm text-ink-soft">Puedes enviar una solicitud antes de alcanzar el objetivo. El equipo solo podrá concederlo cuando lo completes.</p> : null}
          <Button className="mt-8" disabled={requesting || requestSent || logro.earnedByMe || !logro.progressAvailable} onClick={requestAchievement}>
            {logro.earnedByMe ? "Logro conseguido" : requestSent ? "Solicitud enviada" : requesting ? "Enviando…" : "Solicitar este logro"}
          </Button>
          {notice ? <p className="mt-4 text-sm text-ink-soft" role="status">{notice}</p> : null}
        </article>
        {me.role === "TEAM_ADMIN" ? <AdminAchievementControls key={`${slug}/${id}`} achievement={logro} slug={slug} onUpdate={() => setRequestVersion((version) => version + 1)} /> : null}
        </>
      ) : null}
    </div>
  )
}
