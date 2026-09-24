"use client";
import { useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { KpiItem, KpiStrip, TeamSurface, TeamStatus } from "@/app/components/team/TeamPrimitives";

import {
  action,
  date,
  field,
  Heading,
  invitationStatus,
  quiet,
  ReadState,
  useAdminPaths,
  useAdminRead,
  type Invitation,
} from "../AdminUI";

export default function InvitationsPage() {
  const {
    api
  } = useAdminPaths();

  const {
    data,
    error,
    reload
  } = useAdminRead<Invitation[]>(api + "/invitaciones");

  const [days, setDays] = useState("7");
  const [uses, setUses] = useState("10");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const locked = useRef(false);

  async function create(event: React.FormEvent) {
    event.preventDefault();

    if (locked.current)
      return;

    locked.current = true;
    setBusy(true);
    setFailure("");
    setNotice("");

    try {
      const result = await apiFetch<{
        token: string;
      }>(api + "/invitaciones", {
        method: "POST",

        body: JSON.stringify({
          expiresInDays: Number(days),
          maxUses: Number(uses)
        })
      });

      setLink(window.location.origin + "/unirse?token=" + encodeURIComponent(result.token));
      setNotice("Invitación creada.");
      reload();
    } catch (cause) {
      setFailure(cause instanceof ApiError ? cause.message : "No se pudo crear la invitación.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice("Enlace copiado.");
      setFailure("");
    } catch {
      setFailure("No se pudo copiar. Selecciona el enlace y cópialo manualmente.");
    }
  }

  if (!data)
    return <ReadState error={error} reload={reload} />;

  return (
    <>
      <Heading title="Invitaciones del equipo">Invita a nuevos jugadores y controla el acceso al equipo.</Heading>
      <KpiStrip className="[&_dd]:text-3xl mb-5">
        <KpiItem
          label="Invitaciones activas"
          value={data.filter(i => invitationStatus(i) === "Activa").length} />
        <KpiItem label="Total de invitaciones" value={data.length} />
        <KpiItem label="Con algún uso" value={data.filter(i => i.uses > 0).length} />
        <KpiItem label="Caducadas" value={data.filter(i => invitationStatus(i) === "Caducada").length} />
      </KpiStrip>
      {notice ? <p role="status" className="mb-4">{notice}</p> : null}
      {failure ? <p role="alert" className="mb-4 text-[var(--lb-color-danger)]">{failure}</p> : null}
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <TeamSurface>
          <h2 className="team-display text-2xl font-bold uppercase">Crear nueva invitación</h2>
          <form onSubmit={create} className="mt-4">
            <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm">Duración en días
                                <input
                  className={field}
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={days}
                  onChange={e => setDays(e.target.value)} />
              </label>
              <label className="text-sm">Usos máximos
                                <input
                  className={field}
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={uses}
                  onChange={e => setUses(e.target.value)} />
              </label>
              <button className={action + " sm:col-span-2"} disabled={busy}>{busy ? "Creando…" : "Crear invitación"}</button>
            </fieldset>
          </form>
        </TeamSurface>
        <TeamSurface>
          <h2 className="team-display text-2xl font-bold uppercase">{link ? "Última invitación creada" : "Comparte con tu equipo"}</h2>
          {link ? <>
            <label className="mt-4 block text-sm">Enlace de invitación
                            <input readOnly className={field} value={link} onFocus={e => e.currentTarget.select()} />
            </label>
            <button className={quiet + " mt-3"} onClick={() => copy(link)}>Copiar enlace</button>
          </> : <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">Genera un enlace con duración y usos limitados. Compártelo solo con las personas que quieras incorporar al equipo.</p>}
        </TeamSurface>
      </div>
      <TeamSurface className="mt-5">
        <h2 className="team-display text-2xl font-bold uppercase">Lista de invitaciones</h2>
        <div className="mt-5 divide-y divide-[var(--team-line)]">{data.map(invitation => {
            const state = invitationStatus(invitation);

            return (
              <article
                key={invitation.id}
                className="grid items-center gap-4 py-4 md:grid-cols-[130px_1fr_120px]">
                <div>
                  <strong className="block text-sm">Invitación #{invitation.id}</strong>
                  <TeamStatus className="mt-2" tone={state === "Activa" ? "success" : "neutral"}>{state}</TeamStatus>
                </div>
                <div>
                  <p className="text-sm text-[var(--team-muted)]">{invitation.uses}/{invitation.maxUses}{" "}usos · Caduca el {date(invitation.expiresAt)}</p>
                  {invitation.token ? <input
                    aria-label={"Enlace de invitación " + invitation.id}
                    readOnly
                    className={field}
                    value={typeof window !== "undefined" ? window.location.origin + "/unirse?token=" + encodeURIComponent(invitation.token) : ""}
                    onFocus={e => e.currentTarget.select()} /> : <p className="mt-2 text-sm">El enlace de esta invitación antigua no se puede recuperar. Crea una nueva.</p>}
                </div>
                {invitation.token ? <button
                  className={quiet}
                  disabled={state !== "Activa"}
                  onClick={() => copy(window.location.origin + "/unirse?token=" + encodeURIComponent(invitation.token!))}>Copiar enlace</button> : null}
              </article>
            );
          })}{!data.length ? <p className="py-8 text-sm text-[var(--team-muted)]">Todavía no hay invitaciones.</p> : null}</div>
      </TeamSurface>
    </>
  );
}
