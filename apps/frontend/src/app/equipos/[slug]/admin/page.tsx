"use client";
import Link from "next/link";
import { KpiItem, KpiStrip, TeamSurface } from "@/app/components/team/TeamPrimitives";

import {
  Heading,
  ReadState,
  useAdminPaths,
  useAdminRead,
  quiet,
  invitationStatus,
  date,
  type AdminRequest,
  type AdminProposal,
  type Invitation,
  type Member,
} from "./AdminUI";

import type { CatalogAchievement } from "@/types/api";

export default function AdminOverview() {
  const {
    base,
    api
  } = useAdminPaths();

  const members = useAdminRead<Member[]>(api + "/admin/miembros");
  const invitations = useAdminRead<Invitation[]>(api + "/invitaciones");
  const requests = useAdminRead<AdminRequest[]>(api + "/admin/solicitudes?status=all");
  const proposals = useAdminRead<AdminProposal[]>(api + "/admin/propuestas?status=all");
  const catalog = useAdminRead<CatalogAchievement[]>(api + "/logros");
  const sources = [members, invitations, requests, proposals, catalog];

  if (sources.some(s => !s.data))
    return <ReadState error={sources.find(s => s.error)?.error} reload={() => sources.forEach(s => s.reload())} />;

  const pendingRequests = requests.data!.filter(r => r.status === "PENDING");
  const pendingProposals = proposals.data!.filter(r => r.status === "PENDING");

  return (
    <>
      <Heading title="Administración del equipo">Controla el acceso, revisa solicitudes y gestiona el catálogo.</Heading>
      <KpiStrip className="[&_dd]:text-3xl mb-5">
        <KpiItem label="Miembros del equipo" value={members.data!.length} />
        <KpiItem
          label="Invitaciones activas"
          value={invitations.data!.filter(i => invitationStatus(i) === "Activa").length} />
        <KpiItem label="Solicitudes pendientes" value={pendingRequests.length} />
        <KpiItem label="Propuestas pendientes" value={pendingProposals.length} />
        <KpiItem label="Logros en catálogo" value={catalog.data!.length} />
      </KpiStrip>
      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-5">
        <TeamSurface className="min-w-0 !p-4">
          <h2 className="team-display text-xl font-bold uppercase">Invitaciones</h2>
          <p className="my-3 text-sm text-[var(--team-muted)]">Crea enlaces para incorporar nuevos jugadores.</p>
          <Link className={quiet + " w-full"} href={base + "/admin/invitaciones"}>Crear invitación →</Link>
          <h3 className="mt-5 text-sm font-semibold">Últimas invitaciones</h3>
          <div className="divide-y divide-[var(--team-line)]">{invitations.data!.slice(-3).reverse().map(i => <div key={i.id} className="py-3 text-sm">
              <strong>Invitación #{i.id}</strong>
              <p className="mt-1 text-xs text-[var(--team-muted)]">{i.uses}/{i.maxUses}{" "}usos · {invitationStatus(i)}</p>
            </div>)}</div>
          {!invitations.data!.length ? <p className="mt-4 text-sm text-[var(--team-muted)]">Todavía no hay invitaciones.</p> : null}
        </TeamSurface>
        {[{
          title: "Solicitudes de logros",
          path: "solicitudes",

          rows: pendingRequests.map(r => ({
            id: r.id,
            name: r.logro.nombre,
            author: r.user.displayName
          }))
        }, {
          title: "Propuestas de nuevos logros",
          path: "propuestas",

          rows: pendingProposals.map(r => ({
            id: r.id,
            name: r.nombre,
            author: r.user.displayName
          }))
        }].map(group => <TeamSurface className="min-w-0 !p-4" key={group.path}>
          <h2 className="team-display text-xl font-bold uppercase">{group.title}</h2>
          <p className="my-3 text-sm text-[var(--team-muted)]">{group.rows.length}{" "}pendientes de revisión</p>
          <Link className={quiet + " w-full"} href={base + "/admin/" + group.path}>Ver todas →</Link>
          <h3 className="mt-5 text-sm font-semibold">Pendientes más antiguas</h3>
          <div className="divide-y divide-[var(--team-line)]">{group.rows.slice(0, 3).map(row => <Link
              className="block py-3 text-sm hover:underline"
              key={row.id}
              href={base + "/admin/" + group.path + "/" + row.id}>
              <strong className="block break-words">{row.name}</strong>
              <span className="mt-1 block text-xs text-[var(--team-muted)]">{row.author}</span>
            </Link>)}</div>
          {!group.rows.length ? <p className="mt-4 text-sm text-[var(--team-muted)]">No hay pendientes.</p> : null}
        </TeamSurface>)}
        <TeamSurface className="min-w-0 !p-4">
          <h2 className="team-display text-xl font-bold uppercase">Jugadores</h2>
          <p className="my-3 text-sm text-[var(--team-muted)]">{members.data!.filter(m => m.role === "TEAM_ADMIN").length}{" "}administradores en el equipo</p>
          <Link className={quiet + " w-full"} href={base + "/admin/jugadores"}>Ver miembros →</Link>
          <h3 className="mt-5 text-sm font-semibold">Últimos miembros</h3>
          <div className="divide-y divide-[var(--team-line)]">{members.data!.slice(-3).reverse().map(m => <div className="py-3 text-sm" key={m.id}>
              <strong className="break-words">{m.displayName}</strong>
              <p className="mt-1 text-xs text-[var(--team-muted)]">Desde {date(m.joinedAt)}</p>
            </div>)}</div>
        </TeamSurface>
        <TeamSurface className="min-w-0 !p-4">
          <h2 className="team-display text-xl font-bold uppercase">Gestión de logros</h2>
          <p className="my-3 text-sm text-[var(--team-muted)]">Concede logros y actualiza el progreso.</p>
          <Link className={quiet + " w-full"} href={base + "/admin/logros"}>Gestionar catálogo →</Link>
          <h3 className="mt-5 text-sm font-semibold">Últimos logros</h3>
          <div className="divide-y divide-[var(--team-line)]">{catalog.data!.filter(r => !r.isHidden).slice(0, 3).map(
              r => !r.isHidden ? <Link className="block py-3 text-sm hover:underline" key={r.id} href={base + "/logros/" + r.id}>
                <strong className="block break-words">{r.nombre}</strong>
                <span className="mt-1 block text-xs text-[var(--team-muted)]">{r.puntos}{" "}puntos</span>
              </Link> : null
            )}</div>
        </TeamSurface>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <TeamSurface>
          <h2 className="team-display text-xl font-bold uppercase">Accesos rápidos</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className={quiet} href={base + "/admin/invitaciones"}>Invitar</Link>
            <Link className={quiet} href={base + "/admin/solicitudes"}>Revisar solicitudes</Link>
            <Link className={quiet} href={base + "/logros/nuevo"}>Crear logro</Link>
            <Link className={quiet} href={base + "/admin/temporadas"}>Gestionar temporadas</Link>
          </div>
        </TeamSurface>
        <TeamSurface>
          <h2 className="team-display text-xl font-bold uppercase">Consejo para administradores</h2>
          <p className="mt-4 text-sm leading-6 text-[var(--team-muted)]">Una propuesta aprobada amplía el catálogo. Para obtener el logro, el jugador debe cumplir sus criterios y solicitarlo por separado.</p>
        </TeamSurface>
      </div>
    </>
  );
}
