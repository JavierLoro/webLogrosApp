"use client";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/team/PlayerAvatar";
import { AchievementMedia } from "@/app/components/team/AchievementMedia";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { TeamSurface } from "@/app/components/team/TeamPrimitives";
import type { AchievementProgress } from "@/types/api";

import {
  action,
  date,
  field,
  Heading,
  quiet,
  ReadState,
  Status,
  useAdminPaths,
  useAdminRead,
  type AdminProposal,
  type AdminRequest,
} from "./AdminUI";

type RequestDetail = AdminRequest & {
  progress: AchievementProgress | null;
  season: {
    id: number;
    name: string;
    status: "PLANNED" | "ACTIVE" | "CLOSED";
  } | null;
};

export default function ReviewDetail({ proposal = false }: { proposal?: boolean }) {
  const { id, slug } = useParams<{ id: string; slug: string }>();
  return <ReviewDetailContent key={slug + ":" + (proposal ? "proposal:" : "request:") + id} id={id} proposal={proposal} />;
}

function ReviewDetailContent({ id, proposal }: { id: string; proposal: boolean }) {
  const { base, api } = useAdminPaths();
  const kind = proposal ? "propuestas" : "solicitudes";
  const endpoint = api + "/admin/" + kind + "/" + encodeURIComponent(id);

  const {
    data,
    error,
    reload
  } = useAdminRead<AdminProposal | RequestDetail>(endpoint);

  const [reason, setReason] = useState("");
  const [points, setPoints] = useState("");
  const [category, setCategory] = useState("");
  const [definition, setDefinition] = useState("STANDARD");
  const [target, setTarget] = useState("");
  const [scope, setScope] = useState("PERMANENT");
  const [secret, setSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const pending = useRef(false);
  const item = data && "nombre" in data ? data : null;
  const request = data && "seasonId" in data ? data : null;
  const validPoints = points.trim() !== "" && Number.isInteger(Number(points)) && Number(points) >= 0 && Number(points) <= 2147483647;
  const validTarget = definition === "STANDARD" || (target.trim() !== "" && Number.isInteger(Number(target)) && Number(target) > 0 && Number(target) <= 2147483647);
  const eligible = proposal ? validPoints && validTarget : request?.logro.kind !== "PROGRESSIVE" || request?.progress?.status === "ELIGIBLE";

  async function resolve(accept: boolean) {
    if (pending.current || data?.status !== "PENDING" || (accept ? !eligible : !reason.trim()))
      return;

    pending.current = true;
    setBusy(true);
    setFailure("");
    setNotice("");

    try {
      await apiFetch(endpoint + (accept ? "/aceptar" : "/rechazar"), {
        method: "POST",

        body: JSON.stringify(accept ? proposal ? {
          puntos: Number(points),

          ...(category.trim() ? {
            categoria: category.trim()
          } : {}),

          kind: definition,
          scope,
          isSecret: secret,

          ...(definition === "PROGRESSIVE" ? {
            targetValue: Number(target)
          } : {})
        } : {} : {
          reason: reason.trim()
        })
      });

      setNotice(
        accept ? proposal ? "Propuesta añadida al catálogo. No se ha concedido el logro ni se han sumado puntos." : "Solicitud aprobada y logro concedido." : "Rechazo guardado con su motivo."
      );

      reload();
    } catch (cause) {
      setFailure(cause instanceof ApiError ? cause.message : "No se pudo guardar la resolución.");
      reload();
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  if (!data) return (
    <>
      <ReadState error={error} reload={reload} />
      {failure ? <p role="alert">{failure}</p> : null}
    </>
  );

  const name = item?.nombre ?? request!.logro.nombre;
  const description = item?.descripcion ?? request!.logro.descripcion;
  const criteria = item?.criterios ?? request!.logro.criterios;

  return (
    <>
      <Link className={quiet + " mb-5"} href={base + "/admin/" + kind}>← Volver a {kind}</Link>
      <Heading
        title={proposal ? "Detalle de propuesta de nuevo logro" : "Detalle de solicitud de obtención"}>{proposal ? "Decide si esta idea debe incorporarse al catálogo del equipo." : "Comprueba los criterios antes de conceder el logro al jugador."}</Heading>
      {notice ? <p role="status" className="mb-5 rounded-md border border-[var(--team-line)] p-4">{notice}</p> : null}
      {failure ? <p role="alert" className="mb-5 break-words text-[var(--lb-color-danger)]">{failure}</p> : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4 break-words">
          <TeamSurface className="min-w-0">

            <h2 className="team-display break-words text-2xl font-bold">{name}</h2>
            <div className="mt-4 grid items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <Status status={data.status} proposal={proposal} />
              <div className="flex min-w-0 items-center gap-3">
                <PlayerAvatar name={data.user.displayName} size={proposal ? "table" : "session"} className="shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-xs text-[var(--team-muted)]">{proposal ? "Propuesta enviada por" : "Jugador solicitante"}</h3>
                  <p className="mt-1 text-sm font-semibold">{data.user.displayName}</p>
                  <p className="break-all text-xs text-[var(--team-muted)]">{data.user.email}</p>
                </div>
              </div>
              <p className="text-sm text-[var(--team-muted)]">#{data.id}{" · "}{date(data.createdAt)}</p>
            </div>
          </TeamSurface>
          <TeamSurface className="min-w-0">
            {request ? <div className="float-left mb-3 mr-4 w-24 sm:w-32"><AchievementMedia name={name} variant="detail" /></div> : null}
            <h2 className="team-display text-xl font-bold">{request ? "Logro solicitado" : "Descripción"}</h2>
            <p className="mt-3 break-words whitespace-pre-wrap text-sm leading-6 text-[var(--team-muted)]">{description || "Sin descripción."}</p>
            {request ? <div className="clear-both" /> : null}
          </TeamSurface>
          <TeamSurface className="min-w-0">
            <h2 className="team-display text-xl font-bold">Criterios de obtención</h2>
            <ol className="mt-4 list-decimal break-words space-y-3 pl-5 text-sm leading-6">{criteria.map((criterion, index) => <li key={index}>{criterion}</li>)}</ol>
            {!criteria.length ? <p className="mt-3 text-sm">No hay criterios definidos.</p> : null}
          </TeamSurface>
          {request ? <TeamSurface className="min-w-0">
            <h2 className="team-display text-xl font-bold">Contexto de la solicitud</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-[var(--team-muted)]">Ámbito</dt>
                <dd>{request.season ? request.season.name : request.seasonId !== null ? "Temporada #" + request.seasonId : "Permanente"}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--team-muted)]">Puntos</dt>
                <dd>{request.logro.puntos}</dd>
              </div>
              <div>
                <dt className="text-sm text-[var(--team-muted)]">Tipo</dt>
                <dd>{request.logro.kind === "PROGRESSIVE" ? "Progresivo" : "Estándar"}</dd>
              </div>
              {request.logro.kind === "PROGRESSIVE" ? <div>
                <dt className="text-sm text-[var(--team-muted)]">Progreso en el contexto original</dt>
                <dd>{request.progress ? request.progress.currentValue + " / " + request.progress.targetValue : "No disponible"}</dd>
                <p className="mt-2 text-sm text-[var(--team-muted)]">{request.progress?.status === "AWARDED" ? "Ya concedido; el contador está cerrado." : request.progress?.status === "ELIGIBLE" ? "Objetivo alcanzado." : "El objetivo debe estar alcanzado antes de aprobar."}</p>
              </div> : null}
            </dl>
            <Link className={quiet + " mt-5"} href={base + "/logros/" + request.logro.id}>Ver logro en el catálogo →</Link>
          </TeamSurface> : null}
          {item?.logro ? <TeamSurface className="min-w-0">
            <h2 className="team-display text-xl font-bold">Añadida al catálogo</h2>
            <p className="my-3 text-sm text-[var(--team-muted)]">Los miembros pueden solicitar su obtención desde el catálogo.</p>
            <Link className={quiet} href={base + "/logros/" + item.logro.id}>Ver logro →</Link>
          </TeamSurface> : null}
        </div>
        <div className="min-w-0 space-y-4 break-words">
          {proposal ? <TeamSurface className="min-w-0">
            <h2 className="team-display mb-3 text-xl font-bold">Vista previa del logro</h2>
            <AchievementMedia name={name} variant="landscape" />
            <h3 className="team-display mt-3 break-words text-2xl font-bold">{name}</h3>
            <p className="mt-2 break-words text-sm leading-6 text-[var(--team-muted)]">{description}</p>
            {item?.logro || validPoints ? <p className="mt-3 text-sm font-semibold">{item?.logro?.puntos ?? Number(points)}{" puntos"}</p> : null}
          </TeamSurface> : null}

          <TeamSurface className="min-w-0">
            <h2 className="team-display text-xl font-bold">{data.status === "PENDING" ? "Resolver " + (proposal ? "propuesta" : "solicitud") : "Resolución"}</h2>
            {data.status === "PENDING" ? <>
              <fieldset disabled={busy} className="mt-4 space-y-4">
                {proposal ? <>
                  <label className="block text-sm">Puntos
                                        <input
                      className={field}
                      type="number"
                      min="0"
                      max="2147483647"
                      step="1"
                      value={points}
                      onChange={e => setPoints(e.target.value)} />
                  </label>
                  <label className="block text-sm">Categoría (opcional)
                                        <input
                      className={field}
                      maxLength={80}
                      value={category}
                      onChange={e => setCategory(e.target.value)} />
                  </label>
                  <label className="block text-sm">Tipo
                                        <select className={field} value={definition} onChange={e => setDefinition(e.target.value)}>
                      <option value="STANDARD">Estándar</option>
                      <option value="PROGRESSIVE">Progresivo</option>
                    </select>
                  </label>
                  {definition === "PROGRESSIVE" ? <label className="block text-sm">Objetivo obligatorio
                                        <input
                      className={field}
                      type="number"
                      min="1"
                      max="2147483647"
                      step="1"
                      value={target}
                      onChange={e => setTarget(e.target.value)} />
                  </label> : null}
                  <label className="block text-sm">Alcance
                                        <select className={field} value={scope} onChange={e => setScope(e.target.value)}>
                      <option value="PERMANENT">Permanente</option>
                      <option value="SEASONAL">Por temporada</option>
                    </select>
                  </label>
                  <label className="flex min-h-11 items-center gap-3 text-sm">
                    <input type="checkbox" checked={secret} onChange={e => setSecret(e.target.checked)} />Logro secreto
                                      </label>
                </> : null}
                <button className={action + " w-full"} disabled={busy || !eligible} onClick={() => resolve(true)}>{busy ? "Guardando…" : proposal ? "Aprobar e incorporar al catálogo" : "Aprobar y otorgar logro"}</button>
                <label className="block text-sm">Motivo del rechazo (obligatorio al rechazar)
                                    <textarea
                    className={field + " min-h-28"}
                    maxLength={500}
                    value={reason}
                    onChange={e => setReason(e.target.value)} />
                  <span className="mt-1 block text-right text-xs text-[var(--team-muted)]">{reason.length}/500</span>
                </label>
                <button
                  className={quiet + " w-full text-[var(--lb-color-danger)]"}
                  disabled={busy || !reason.trim()}
                  onClick={() => resolve(false)}>Rechazar {proposal ? "propuesta" : "solicitud"}</button>
              </fieldset>
              <p className="mt-4 text-xs leading-5 text-[var(--team-muted)]">{proposal ? "Aprobar crea un logro en el catálogo. La obtención se solicita por separado." : "La concesión se realiza en el contexto original de esta solicitud."}</p>
            </> : <div className="mt-4 space-y-3">
              <Status status={data.status} proposal={proposal} />
              {data.reviewedAt ? <p className="text-sm">Revisada el {date(data.reviewedAt)}</p> : null}
              {data.rejectionReason ? <p className="break-words whitespace-pre-wrap text-sm leading-6">{data.rejectionReason}</p> : null}
            </div>}
          </TeamSurface>
          <TeamSurface className="min-w-0">
            <h2 className="team-display text-xl font-bold">Revisa con criterio</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--team-muted)]">La decisión debe basarse en condiciones claras y comprobables. El motivo de rechazo se conserva en el historial del jugador.</p>
          </TeamSurface>
        </div>
      </div>
    </>
  );
}
