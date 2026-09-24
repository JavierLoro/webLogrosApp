"use client";
import Link from "next/link";
import { PlayerAvatar } from "@/app/components/team/PlayerAvatar";
import { AchievementMedia } from "@/app/components/team/AchievementMedia";
import { useState } from "react";
import { KpiItem, KpiStrip, TeamSurface } from "@/app/components/team/TeamPrimitives";

import {
  date,
  EmptyRows,
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

export default function ReviewList(
  {
    proposal = false
  }: {
    proposal?: boolean;
  }
) {
  const {
    base,
    api
  } = useAdminPaths();

  const kind = proposal ? "propuestas" : "solicitudes";

  const {
    data,
    error,
    reload
  } = useAdminRead<(AdminProposal | AdminRequest)[]>(api + "/admin/" + kind + "?status=all");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [order, setOrder] = useState("oldest");

  if (!data)
    return <ReadState error={error} reload={reload} />;

  const title = (r: AdminProposal | AdminRequest) => "nombre" in r ? r.nombre : r.logro.nombre;

  const rows = data.filter(
    r => (status === "all" || r.status === status) && (title(r) + " " + r.user.displayName + " " + r.user.email).toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))
  ).sort(
    (a, b) => (order === "oldest" ? 1 : -1) * (Date.parse(a.createdAt) - Date.parse(b.createdAt))
  );

  return (
    <>
      <Heading title={proposal ? "Propuestas de nuevos logros" : "Solicitudes de obtención"}>{proposal ? "Revisa las ideas de los miembros del equipo para incorporarlas al catálogo." : "Revisa si los jugadores cumplen los criterios de los logros que solicitan."}</Heading>
      <KpiStrip className="[&_dd]:text-3xl mb-5">
        <KpiItem label="Pendientes" value={data.filter(r => r.status === "PENDING").length} />
        <KpiItem
          label={proposal ? "Añadidas al catálogo" : "Aprobadas"}
          value={data.filter(r => r.status === "ACCEPTED").length} />
        <KpiItem label="Rechazadas" value={data.filter(r => r.status === "REJECTED").length} />
      </KpiStrip>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link className={quiet} href={base + "/admin/" + (proposal ? "solicitudes" : "propuestas")}>{proposal ? "Solicitudes de obtención" : "Propuestas de nuevos logros"}{" "}→</Link>
        <Link className={quiet} href={base + "/admin/logros"}>Ver catálogo</Link>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <TeamSurface className="min-w-0">
          <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_160px]">
            <label className="text-sm">Buscar
                            <input
                className={field}
                type="search"
                placeholder="Logro o jugador"
                value={search}
                onChange={e => setSearch(e.target.value)} />
            </label>
            <label className="text-sm">Estado
                            <select className={field} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="all">Todos los estados</option>
                <option value="PENDING">Pendientes</option>
                <option value="ACCEPTED">{proposal ? "Añadidas al catálogo" : "Aprobadas"}</option>
                <option value="REJECTED">Rechazadas</option>
              </select>
            </label>
            <label className="text-sm">Orden
                            <select className={field} value={order} onChange={e => setOrder(e.target.value)}>
                <option value="oldest">Más antiguas</option>
                <option value="newest">Más recientes</option>
              </select>
            </label>
          </div>
          <div className="relative min-w-0 overflow-x-auto">
            <table className="w-full text-left text-sm [&_td]:break-words">
              <thead className="border-b border-[var(--team-line)] text-[var(--team-muted)]">
                <tr>{[proposal ? "Propuesta" : "Logro solicitado", "Jugador", "Fecha", "Estado", "Acción"].map(h => <th key={h} scope="col" className="px-3 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>{rows.map(row => <tr key={row.id} className="border-b border-[var(--team-line)]">
                  <td className="min-w-40 max-w-72 px-3 py-2 font-semibold"><div className="flex items-center gap-2"><span className="w-9 shrink-0"><AchievementMedia name={title(row)} variant="square" /></span><span className="min-w-0 break-words">{title(row)}</span></div></td>
                  <td className="px-3 py-2"><div className="flex items-center gap-2"><PlayerAvatar name={row.user.displayName} size="table" className="shrink-0" /><span>{row.user.displayName}</span></div></td>
                  <td className="whitespace-nowrap px-3 py-2">{date(row.createdAt)}</td>
                  <td className="px-3 py-2">
                    <Status status={row.status} proposal={proposal} />
                  </td>
                  <td className="px-3 py-2">
                    <Link className={quiet + " whitespace-nowrap"} href={base + "/admin/" + kind + "/" + row.id}>Ver detalle
                                            <span className="sr-only">de {title(row)}</span>
                    </Link>
                  </td>
                </tr>)}</tbody>
            </table>
          </div>
          {!rows.length ? <EmptyRows /> : null}
          <p className="mt-4 text-xs text-[var(--team-muted)]">{rows.length}{" "}de {data.length}{" "}registros</p>
          {proposal ? <div className="mt-5 grid gap-4 border-t border-[var(--team-line)] pt-5 md:grid-cols-2">
            {([{ status: "ACCEPTED", label: "Añadidas recientemente" }, { status: "REJECTED", label: "Rechazadas recientemente" }] as const).map(group => {
              const recent = data.filter(row => row.status === group.status).sort((a, b) => Date.parse(b.reviewedAt ?? b.createdAt) - Date.parse(a.reviewedAt ?? a.createdAt)).slice(0, 2);
              return <section key={group.status} className="min-w-0">
                <h2 className="team-display text-lg font-bold">{group.label}</h2>
                <div className="mt-2 divide-y divide-[var(--team-line)]">
                  {recent.map(row => <Link key={row.id} href={base + "/admin/propuestas/" + row.id} className="flex items-center gap-2 py-3 text-sm hover:underline">
                    <span className="w-8 shrink-0"><AchievementMedia name={title(row)} variant="square" /></span>
                    <span className="min-w-0"><strong className="block break-words">{title(row)}</strong><span className="text-xs text-[var(--team-muted)]">{row.user.displayName}{" · "}{date(row.reviewedAt ?? row.createdAt)}</span></span>
                  </Link>)}
                  {!recent.length ? <p className="py-3 text-sm text-[var(--team-muted)]">Todavía no hay propuestas en este estado.</p> : null}
                </div>
              </section>;
            })}
          </div> : null}

        </TeamSurface>
        <TeamSurface>
          <h2 className="team-display text-xl font-bold uppercase">{proposal ? "Qué se revisa" : "Cómo revisar solicitudes"}</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">{proposal ? "Comprueba que la idea sea clara, medible y no duplique un logro. Al aprobar, defines los puntos y las condiciones del catálogo. No se concede el logro ni se suman puntos al autor." : "Comprueba todos los criterios antes de conceder el logro. En los progresivos, el jugador debe alcanzar el objetivo. Cada solicitud conserva su temporada original."}</p>
        </TeamSurface>
      </div>
    </>
  );
}
