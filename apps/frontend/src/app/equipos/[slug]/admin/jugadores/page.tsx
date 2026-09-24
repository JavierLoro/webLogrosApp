"use client";
import Link from "next/link";
import { useState } from "react";
import { KpiItem, KpiStrip, TeamSurface, TeamStatus } from "@/app/components/team/TeamPrimitives";

import {
  action,
  date,
  EmptyRows,
  field,
  Heading,
  ReadState,
  useAdminPaths,
  useAdminRead,
  type Member,
} from "../AdminUI";

export default function MembersPage() {
  const {
    base,
    api
  } = useAdminPaths();

  const {
    data,
    error,
    reload
  } = useAdminRead<Member[]>(api + "/admin/miembros");

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  if (!data)
    return <ReadState error={error} reload={reload} />;

  const rows = data.filter(
    m => (role === "all" || m.role === role) && (m.displayName + " " + m.email).toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))
  );

  return (
    <>
      <Heading title="Gestión de jugadores">Consulta los miembros del equipo y sus roles actuales.</Heading>
      <KpiStrip className="[&_dd]:text-3xl mb-5">
        <KpiItem label="Miembros" value={data.length} />
        <KpiItem label="Administradores" value={data.filter(m => m.role === "TEAM_ADMIN").length} />
        <KpiItem label="Jugadores" value={data.filter(m => m.role === "PLAYER").length} />
      </KpiStrip>
      <TeamSurface>
        <div className="mb-5 grid items-end gap-3 sm:grid-cols-[1fr_200px_auto]">
          <label className="text-sm">Buscar jugador
                        <input
              className={field}
              type="search"
              placeholder="Nombre o email"
              value={search}
              onChange={e => setSearch(e.target.value)} />
          </label>
          <label className="text-sm">Rol
                        <select className={field} value={role} onChange={e => setRole(e.target.value)}>
              <option value="all">Todos</option>
              <option value="TEAM_ADMIN">Administradores</option>
              <option value="PLAYER">Jugadores</option>
            </select>
          </label>
          <Link className={action} href={base + "/admin/invitaciones"}>Invitar jugador</Link>
        </div>
        <div className="relative min-w-0 overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:break-words">
            <thead className="border-b border-[var(--team-line)] text-[var(--team-muted)]">
              <tr>
                <th className="p-3" scope="col">Jugador</th>
                <th className="p-3" scope="col">Rol actual</th>
                <th className="p-3" scope="col">Fecha de unión</th>
              </tr>
            </thead>
            <tbody>{rows.map(m => <tr key={m.id} className="border-b border-[var(--team-line)]">
                <td className="p-3">
                  <strong className="block">{m.displayName}</strong>
                  <span className="text-[var(--team-muted)]">{m.email}</span>
                </td>
                <td className="p-3">
                  <TeamStatus tone={m.role === "TEAM_ADMIN" ? "warning" : "neutral"}>{m.role === "TEAM_ADMIN" ? "Administrador" : "Jugador"}</TeamStatus>
                </td>
                <td className="whitespace-nowrap p-3">{date(m.joinedAt)}</td>
              </tr>)}</tbody>
          </table>
        </div>
        {!rows.length ? <EmptyRows /> : null}
      </TeamSurface>
    </>
  );
}
