"use client"

import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { PageHeader } from "@/app/components/team/PageHeader"
import { KpiItem, KpiStrip, TeamStatus, TeamSurface } from "@/app/components/team/TeamPrimitives"
import { useTeamContext } from "@/app/components/team/TeamShell"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { apiFetch, ApiError } from "@/lib/api"
import type { AchievementRequest, HiddenAchievement, Logro } from "@/types/api"
import styles from "./requests.module.css"

type ReviewStatus = "PENDING" | "ACCEPTED" | "REJECTED"
type Request = AchievementRequest & {
  seasonId: number | null;
  rejectionReason: string | null
}
type Proposal = {
  id: number;
  nombre: string;
  descripcion: string;
  criterios: string[]
  status: ReviewStatus;
  createdAt: string;
  reviewedAt: string | null
  rejectionReason: string | null;
  logro: Logro | HiddenAchievement | null
} | {
  id: number;
  isHidden: true;
  logro: HiddenAchievement
}
type Data = {
  requests: Request[];
  proposals: Proposal[]
}
type Entry = {
  id: number;
  kind: "solicitud" | "propuesta";
  hidden: boolean;
  name: string
  description?: string | null;
  criteria?: string[];
  status?: ReviewStatus
  createdAt?: string;
  reviewedAt?: string | null;
  reason?: string | null
  achievementId?: number;
  points?: number;
  category?: string | null;
  seasonId?: number | null
}
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(value)) : "—"
const statusText = (entry: Entry) => entry.status === "ACCEPTED" ? entry.kind === "propuesta" ? "Añadida al catálogo" : "Aprobada" : entry.status === "REJECTED" ? "Rechazada" : entry.status === "PENDING" ? "Pendiente" : "Información oculta"
function StatusBadge({ entry }: { entry: Entry }) {
  return <TeamStatus tone={entry.status === "ACCEPTED" ? "success" : entry.status === "REJECTED" ? "danger" : entry.status === "PENDING" ? "warning" : "neutral"}>
    {statusText(entry)}
  </TeamStatus>
}
function requestEntry(request: Request): Entry {
  const hidden = "isHidden" in request.logro && request.logro.isHidden
  return {
    id: request.id, kind: "solicitud", hidden: !!hidden, name: hidden ? "Logro secreto" : (request.logro as Logro).nombre,
    status: request.status, createdAt: request.createdAt, reviewedAt: request.reviewedAt,
    reason: hidden ? null : request.rejectionReason, achievementId: request.logro.id, seasonId: request.seasonId,
    ...(!hidden ? { description: (request.logro as Logro).descripcion, criteria: (request.logro as Logro).criterios, points: (request.logro as Logro).puntos, category: (request.logro as Logro).categoria } : {})
  }
}
function proposalEntry(proposal: Proposal): Entry {
  if ("isHidden" in proposal) return { id: proposal.id, kind: "propuesta", hidden: true, name: "Propuesta de logro secreto" }
  return {
    id: proposal.id, kind: "propuesta", hidden: false, name: proposal.nombre, description: proposal.descripcion,
    criteria: proposal.criterios, status: proposal.status, createdAt: proposal.createdAt, reviewedAt: proposal.reviewedAt,
    reason: proposal.rejectionReason, achievementId: proposal.logro?.id
  }
}

export default function SolicitudesPage() {
  const { slug } = useParams<{ slug: string }>()
  const { team, me } = useTeamContext()
  const searchParams = useSearchParams()
  const [state, setState] = useState<{
    slug: string;
    data?: Data;
    error?: ApiError
  } | null>(null)
  const [version, setVersion] = useState(0)
  const heading = useRef<HTMLDivElement>(null)
  const data = state?.slug === slug ? state.data : undefined
  const error = state?.slug === slug ? state.error : undefined
  const base = `/equipos/${encodeURIComponent(slug)}`
  const query = searchParams.get("buscar") ?? ""
  const filter = searchParams.get("estado") ?? "ALL"
  const order = searchParams.get("orden") ?? "recent"
  const selectionKind = searchParams.get("tipo")
  const selectionId = searchParams.get("detalle")
  const selectedKey = selectionId ? `${selectionKind}:${selectionId}` : ""

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      apiFetch<Request[]>(`/api/equipos/${encodeURIComponent(slug)}/solicitudes`, { signal: controller.signal }),
      apiFetch<Proposal[]>(`/api/equipos/${encodeURIComponent(slug)}/propuestas`, { signal: controller.signal }),
    ]).then(([requests, proposals]) => { if (!controller.signal.aborted) setState({ slug, data: { requests, proposals } }) })
      .catch((cause: unknown) => { if (!controller.signal.aborted) setState({ slug, error: cause instanceof ApiError ? cause : new ApiError("No se pudo cargar tu historial.", 500) }) })
    return () => controller.abort()
  }, [slug, version])

  useEffect(() => { if (selectedKey && data) heading.current?.focus() }, [selectedKey, data])

  function href(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key))
    return `${base}/solicitudes${params.size ? `?${params}` : ""}`
  }
  function updateFilter(key: string, value: string) {
    window.history.replaceState(null, "", href({ [key]: value }))
  }
  const requests = data?.requests.map(requestEntry) ?? []
  const proposals = data?.proposals.map(proposalEntry) ?? []
  const all = [...requests, ...proposals]
  const selected = selectedKey ? all.find(entry => entry.kind === selectionKind && String(entry.id) === selectionId) : undefined
  function filtered(entries: Entry[]) {
    return entries.filter(entry => (filter === "ALL" || entry.status === filter) && `${entry.name} ${entry.description ?? ""}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")))
      .sort((a, b) => (order === "oldest" ? 1 : -1) * ((a.createdAt ? Date.parse(a.createdAt) : 0) - (b.createdAt ? Date.parse(b.createdAt) : 0)))
  }
  const backHref = href({ tipo: null, detalle: null })
  const proposalAction = me.role === "PLAYER" ? <Link className={styles.primary} href={`${base}/logros/nuevo`}>+ Proponer nuevo logro</Link> : null

  function table(entries: Entry[], proposal: boolean) {
    const rows = filtered(entries)
    return <section className={`${styles.list} ${proposal ? styles.proposals : ""}`} aria-labelledby={proposal ? "proposals-title" : "requests-title"}>
      <div className={styles.sectionHeader}>
        <MaterialIcon name={proposal ? "star" : "emoji_events"} className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 id={proposal ? "proposals-title" : "requests-title"} className="team-display text-xl font-bold uppercase">
            {proposal ? "Mis propuestas de nuevos logros" : "Mis solicitudes de obtención"}
          </h2>
          <p className={styles.muted}>
            {proposal ? "Ideas que has enviado para ampliar el catálogo del equipo." : "Logros del catálogo cuya obtención has solicitado."}
          </p>
        </div>
        {proposal ? proposalAction : <Link className={styles.primary} href={`${base}/logros`}>Solicitar logro existente</Link>}
      </div>
      {!rows.length ? <div className={styles.empty}>
        <h3>
          {entries.length ? "No hay resultados con estos filtros" : proposal ? "Todavía no has propuesto ningún logro" : "Todavía no has solicitado ningún logro"}
        </h3>
        <p className={styles.muted}>
          {entries.length ? "Prueba otro nombre o estado." : proposal ? "Comparte una idea para el catálogo del equipo." : "Abre un logro del catálogo para solicitar su obtención."}
        </p>
      </div> : <div className={styles.tableWrap} role="region" aria-label={proposal ? "Tabla de propuestas" : "Tabla de solicitudes"} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>
                {proposal ? "Propuesta" : "Logro"}
              </th>
              {!proposal && <th>Puntos</th>}
              <th>Fecha de envío</th>
              <th>Estado</th>
              <th>
                {proposal ? "Resultado" : "Revisión"}
              </th>
              <th>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(entry => <tr key={entry.id}>
              <td>
                <div className={styles.identity}>
                  <span className={styles.media} aria-hidden="true">
                    <MaterialIcon name={entry.hidden ? "flag" : proposal ? "star" : "emoji_events"} className="size-7" />
                  </span>
                  <div>
                    <strong title={entry.name}>
                      {entry.name}
                    </strong>
                    {entry.description && <p className={styles.excerpt}>
                      {entry.description}
                    </p>}
                  </div>
                </div>
              </td>
              {!proposal && <td>
                {entry.points ?? "—"}
              </td>}
              <td className={styles.nowrap}>
                {date(entry.createdAt)}
              </td>
              <td>
                <StatusBadge entry={entry} />
              </td>
              <td className={styles.result}>
                <span className={styles.resultSummary} title={entry.reason ?? undefined}>
                {proposal ? entry.status === "REJECTED" ? entry.reason ?? "Sin motivo disponible" : entry.status === "ACCEPTED" ? "Añadida al catálogo" : entry.hidden ? "Detalles ocultos" : "Pendiente de revisión" : date(entry.reviewedAt)}
                </span>
              </td>
              <td>
                <Link className={styles.button} href={href({ tipo: entry.kind, detalle: String(entry.id) })} aria-label={`Ver ${proposal ? "propuesta" : "solicitud"}: ${entry.name}`}>Ver {proposal ? "propuesta" : "solicitud"}
                </Link>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>}
    </section>
  }

  return <div className={styles.page}>
    <div ref={heading} tabIndex={-1} className="outline-none">
      <PageHeader title={selectedKey ? selectionKind === "propuesta" ? "Detalle de mi propuesta" : "Detalle de mi solicitud" : "Mis solicitudes"}
        description={selectedKey ? "Consulta los datos enviados y el resultado de la revisión." : "Tus solicitudes de obtención y tus propuestas de nuevos logros, en un mismo lugar."}
        breadcrumbs={[{ label: team.nombre, href: base }, { label: "Mis solicitudes", ...(selectedKey ? { href: backHref } : {}) }, ...(selectedKey ? [{ label: "Detalle" }] : [])]}
        actions={selectedKey ? <Link className={styles.button} href={backHref}>← Volver al historial</Link> : undefined} />
    </div>
    {!data && !error && <TeamSurface className="mt-6" role="status">Cargando tu historial…</TeamSurface>}
    {error && <TeamSurface className="mt-6">
      <h2 className="text-xl font-semibold">
        {error.status === 401 ? "Inicia sesión para consultar tu historial" : error.status === 403 ? "No tienes acceso a este equipo" : error.status === 404 ? "No se encontró el equipo" : "No se pudo cargar el historial"}
      </h2>
      <p role="alert" className="my-3">
        {error.message}
      </p>
      {error.status === 401 ? <Link className={styles.primary} href="/login">Iniciar sesión</Link> : <button className={styles.button} onClick={() => { setState(null); setVersion(value => value + 1) }}>Reintentar</button>}
    </TeamSurface>}
    {data && selectedKey && !selected && <TeamSurface className="mt-6">
      <h2 className="text-xl font-semibold">No se encontró este elemento en tu historial</h2>
      <p className="my-3">Comprueba el enlace o vuelve a tus solicitudes.</p>
      <Link href={backHref} className={styles.button}>Volver al historial</Link>
    </TeamSurface>}
    {data && selected && <div className={styles.detailGrid}>
      <div className="min-w-0 space-y-4">
        <TeamSurface>
          <div className={styles.detailIdentity}>
            <span className={styles.detailMedia} aria-hidden="true">
              <MaterialIcon name={selected.kind === "propuesta" ? "star" : "emoji_events"} className="size-16" />
            </span>
            <div>
              <h2 className="team-display text-3xl font-bold">
                {selected.name}
              </h2>
              <p className="mt-3 whitespace-pre-wrap break-words text-[var(--team-muted)]">
                {selected.hidden ? "Los datos de este logro permanecen ocultos." : selected.description || "Sin descripción adicional."}
              </p>
              {selected.points !== undefined && <p className="mt-4 font-semibold">
                {selected.points} puntos{selected.category ? ` · ${selected.category}` : ""}
              </p>}
            </div>
          </div>
        </TeamSurface>
        {!selected.hidden && <TeamSurface>
          <h2 className="mb-4 text-lg font-semibold">
            {selected.kind === "propuesta" ? "Criterios propuestos" : "Criterios de obtención"}
          </h2>
          {selected.criteria?.length ? <ol className={styles.criteria}>
            {selected.criteria.map((criterion, index) => <li key={index}>
              <span>
                {index + 1}
              </span>
              <p>
                {criterion}
              </p>
            </li>)}
          </ol> : <p className={styles.muted}>Sin criterios adicionales.</p>}
        </TeamSurface>}
        <TeamSurface>
          <h2 className="mb-4 text-lg font-semibold">Datos del envío</h2>
          <dl className={styles.metadata}>
            <div>
              <dt>Fecha de envío</dt>
              <dd>
                {date(selected.createdAt)}
              </dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>#{selected.id}
              </dd>
            </div>
            {selected.kind === "solicitud" && <div>
              <dt>Contexto de la solicitud</dt>
              <dd>
                {selected.seasonId ? `Temporada #${selected.seasonId}` : "Logro permanente"}
              </dd>
            </div>}
          </dl>
        </TeamSurface>
      </div>
      <aside className="min-w-0 space-y-4">
        <TeamSurface>
          <h2 className="mb-4 text-lg font-semibold">Estado de {selected.kind === "propuesta" ? "la propuesta" : "la solicitud"}
          </h2>
          <StatusBadge entry={selected} />
          <p className="my-4 text-[var(--team-muted)]">
            {selected.hidden ? "La información de este logro está protegida porque es secreto." : selected.status === "PENDING" ? "Pendiente de revisión por el equipo de administración." : selected.status === "ACCEPTED" ? selected.kind === "propuesta" ? "Tu propuesta se ha incorporado al catálogo. Esto no concede el logro ni suma puntos; puedes solicitar su obtención desde el catálogo." : "El equipo ha aprobado tu solicitud de obtención." : "El equipo ha revisado y rechazado este envío."}
          </p>
          {selected.status === "REJECTED" && !selected.hidden && <div className={styles.rejection}>
            <h3 className="font-semibold">Motivo del rechazo</h3>
            <p className="mt-2 whitespace-pre-wrap break-words">
              {selected.reason || "No hay un motivo registrado."}
            </p>
          </div>}
          {selected.achievementId && !selected.hidden && <Link className={styles.primary} href={`${base}/logros/${selected.achievementId}`}>Ver logro →</Link>}
        </TeamSurface>
        <TeamSurface>
          <h2 className="mb-4 text-lg font-semibold">Historial</h2>
          {selected.createdAt ? <ol className={styles.timeline}>
            <li>
              <strong>Enviada</strong>
              <time dateTime={selected.createdAt}>
                {date(selected.createdAt)}
              </time>
            </li>
            {selected.reviewedAt && <li>
              <strong>
                {statusText(selected)}
              </strong>
              <time dateTime={selected.reviewedAt}>
                {date(selected.reviewedAt)}
              </time>
            </li>}
          </ol> : <p className={styles.muted}>Información oculta.</p>}
        </TeamSurface>
      </aside>
    </div>}
    {data && !selectedKey && <>
      <KpiStrip className="mt-5">
        <KpiItem label="Pendientes" value={all.filter(entry => entry.status === "PENDING").length} icon={<MaterialIcon name="timer" />} />
        <KpiItem label="Aprobadas" value={all.filter(entry => entry.status === "ACCEPTED").length} icon={<MaterialIcon name="check" />} />
        <KpiItem label="Rechazadas" value={all.filter(entry => entry.status === "REJECTED").length} icon={<MaterialIcon name="close" />} />
        <KpiItem label="Solicitudes de obtención" value={requests.length} />
        <KpiItem label="Propuestas enviadas" value={proposals.length} />
      </KpiStrip>
      {proposals.some(entry => entry.hidden) && <p className="mt-2 text-sm text-[var(--team-muted)]">Los recuentos por estado no incluyen las propuestas cuyo estado está oculto.</p>}
      <div className={styles.layout}>
        <div className="min-w-0">
          <div className={styles.toolbar}>
            <nav aria-label="Secciones del historial" className={styles.anchors}>
              <a href="#requests-title">Solicitudes ({requests.length})</a>
              <a href="#proposals-title">Mis propuestas ({proposals.length})</a>
            </nav>
            <label className={styles.search}>
              <span className="sr-only">Buscar en el historial</span>
              <input type="search" value={query} onChange={event => updateFilter("buscar", event.target.value)} placeholder="Buscar en mi historial…" />
            </label>
            <label>
              <span className="sr-only">Filtrar por estado</span>
              <select value={filter} onChange={event => updateFilter("estado", event.target.value)}>
                <option value="ALL">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="ACCEPTED">Aprobadas</option>
                <option value="REJECTED">Rechazadas</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Ordenar por fecha</span>
              <select value={order} onChange={event => updateFilter("orden", event.target.value)}>
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguas</option>
              </select>
            </label>
          </div>
          <div className="space-y-4">
            {table(requests, false)}{table(proposals, true)}
          </div>
        </div>
        <aside className="space-y-4">
          <TeamSurface>
            <h2 className="team-display text-lg font-bold uppercase">¿Qué quieres hacer?</h2>
            <h3 className="mt-5 font-semibold">Solicitar un logro existente</h3>
            <p className="mt-2 text-sm text-[var(--team-muted)]">Cuando cumplas sus criterios, solicita su obtención desde el catálogo.</p>
            <Link className={`${styles.button} mt-4`} href={`${base}/logros`}>Ver catálogo →</Link>
            {me.role === "PLAYER" && <>
              <h3 className="mt-6 font-semibold">Proponer un nuevo logro</h3>
              <p className="mt-2 mb-4 text-sm text-[var(--team-muted)]">Comparte una idea para que el equipo la valore. Aprobarla no concede puntos.</p>
              {proposalAction}
            </>}
          </TeamSurface>
          <TeamSurface>
            <h2 className="mb-4 font-semibold">Estados de tus envíos</h2>
            <ul className="space-y-4 text-sm">
              <li>
                <TeamStatus tone="warning">Pendiente</TeamStatus>
                <p className="mt-2 text-[var(--team-muted)]">A la espera de revisión.</p>
              </li>
              <li>
                <TeamStatus tone="success">Aprobada</TeamStatus>
                <p className="mt-2 text-[var(--team-muted)]">Solicitud aceptada o propuesta añadida al catálogo.</p>
              </li>
              <li>
                <TeamStatus tone="danger">Rechazada</TeamStatus>
                <p className="mt-2 text-[var(--team-muted)]">Consulta el motivo en el detalle.</p>
              </li>
            </ul>
          </TeamSurface>
        </aside>
      </div>
    </>}
  </div>
}
