"use client";
import Link from "next/link";
import { useState } from "react";
import { KpiItem, KpiStrip, TeamSurface, TeamStatus } from "@/app/components/team/TeamPrimitives";
import { AdminAchievementControls } from "@/app/components/logros/AdminAchievementControls";
import type { CatalogAchievement, VisibleAchievement } from "@/types/api";
import { action, EmptyRows, field, Heading, quiet, ReadState, useAdminPaths, useAdminRead } from "../AdminUI";

export default function AchievementsPage() {
  const {
    base,
    api,
    slug
  } = useAdminPaths();

  const {
    data,
    error,
    reload
  } = useAdminRead<CatalogAchievement[]>(api + "/logros");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [kind, setKind] = useState("all");

  if (!data)
    return <ReadState error={error} reload={reload} />;

  const visible = data.filter((r): r is VisibleAchievement => !r.isHidden);

  const rows = visible.filter(
    r => (kind === "all" || r.kind === kind) && (r.nombre + " " + (r.descripcion ?? "")).toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es"))
  );

  const achievement = visible.find(r => r.id === selected);

  return (
    <>
      <Heading title="Gestión de logros">Organiza el catálogo y gestiona la concesión, el progreso y la visibilidad.</Heading>
      <KpiStrip className="[&_dd]:text-3xl mb-5">
        <KpiItem label="Logros en catálogo" value={visible.length} />
        <KpiItem
          label="Categorías"
          value={new Set(visible.flatMap(r => r.categoria ? [r.categoria] : [])).size} />
        <KpiItem label="Progresivos" value={visible.filter(r => r.kind === "PROGRESSIVE").length} />
        <KpiItem label="Secretos" value={visible.filter(r => r.isSecret).length} />
      </KpiStrip>
      <div className="mb-4 flex flex-wrap gap-3">
        <Link className={action} href={base + "/logros/nuevo"}>Crear nuevo logro</Link>
        <Link className={quiet} href={base + "/admin/propuestas"}>Revisar propuestas</Link>
      </div>
      <div className="grid items-start gap-5 grid-cols-[minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_340px]">
        <TeamSurface className="min-w-0">
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="text-sm">Buscar logro
                            <input
                className={field}
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre o descripción" />
            </label>
            <label className="text-sm">Tipo
                            <select className={field} value={kind} onChange={e => setKind(e.target.value)}>
                <option value="all">Todos los tipos</option>
                <option value="STANDARD">Estándar</option>
                <option value="PROGRESSIVE">Progresivo</option>
              </select>
            </label>
          </div>
          <div className="relative min-w-0 overflow-x-auto">
            <table className="w-full text-left text-sm [&_td]:break-words">
              <thead className="border-b border-[var(--team-line)] text-[var(--team-muted)]">
                <tr>{["Logro", "Puntos", "Condiciones", "Acciones"].map(h => <th className="p-3" key={h} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>{rows.map(r => <tr key={r.id} className="border-b border-[var(--team-line)]">
                  <td className="min-w-40 max-w-72 p-3">
                    <Link className="font-semibold hover:underline" href={base + "/logros/" + r.id}>{r.nombre}</Link>
                    <p className="mt-1 text-xs text-[var(--team-muted)]">{r.categoria || "Sin categoría"}</p>
                  </td>
                  <td className="p-3">{r.puntos}</td>
                  <td className="p-3">
                    <p>{r.kind === "PROGRESSIVE" ? "Progresivo · " + r.targetValue : "Estándar"}</p>
                    <p className="mt-1 text-xs text-[var(--team-muted)]">{r.scope === "SEASONAL" ? "Por temporada" : "Permanente"}</p>
                    {r.isSecret ? <TeamStatus className="mt-2">Secreto{r.isRevealed ? " revelado" : ""}</TeamStatus> : null}
                  </td>
                  <td className="p-3">
                    <button className={quiet} onClick={() => setSelected(r.id)} aria-pressed={selected === r.id}>Gestionar
                                            <span className="sr-only"> {r.nombre}</span>
                    </button>
                  </td>
                </tr>)}</tbody>
            </table>
          </div>
          {!rows.length ? <EmptyRows /> : null}
        </TeamSurface>
        <div className="min-w-0 [&_select]:min-w-0 [&_select]:max-w-full">{achievement ? <>
            <h2 className="team-display mb-3 text-2xl font-bold">{achievement.nombre}</h2>
            <AdminAchievementControls key={achievement.id} achievement={achievement} slug={slug} onUpdate={reload} />
          </> : <TeamSurface>
            <h2 className="team-display text-2xl font-bold">Asignación y progreso</h2>
            <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">Selecciona «Gestionar» en un logro para elegir un miembro, concederlo o actualizar su contador. Los progresivos requieren alcanzar el objetivo.</p>
          </TeamSurface>}</div>
      </div>
    </>
  );
}
