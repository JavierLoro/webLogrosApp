"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTeamContext } from "@/app/components/team/TeamShell";
import { useAdminPaths, quiet } from "./AdminUI";

const links = [
  ["", "Resumen"],
  ["invitaciones", "Invitaciones"],
  ["jugadores", "Jugadores"],
  ["logros", "Logros"],
  ["temporadas", "Temporadas"],
  ["solicitudes", "Solicitudes de obtención"],
  ["propuestas", "Propuestas"]
] as const;

export default function AdminLayout(
  {
    children
  }: {
    children: React.ReactNode;
  }
) {
  const {
    base
  } = useAdminPaths();

  const pathname = usePathname();
  const context = useTeamContext();
  const section = links.find(([path]) => path && pathname.startsWith(`${base}/admin/${path}`));

  if (context.me.role !== "TEAM_ADMIN") return (
    <div className="p-8">
      <h1 className="team-display text-3xl">Acceso restringido</h1>
      <p className="my-4">Solo los administradores del equipo pueden gestionar esta sección.</p>
      <Link className={quiet} href={base}>Volver al equipo</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] px-[var(--lb-page-gutter)] py-6">
      <nav
        aria-label="Ruta de administración"
        className="mb-5 flex flex-wrap gap-2 text-sm text-[var(--team-muted)]">
        <Link href={base}>{context.team.nombre}</Link>
        <span aria-hidden="true">/</span>
        <Link href={`${base}/admin`}>Administración</Link>
        {section ? <>
          <span aria-hidden="true">/</span>
          <Link href={`${base}/admin/${section[0]}`}>{section[1]}</Link>
        </> : null}
        {/\/[0-9]+$/.test(pathname) ? <>
          <span aria-hidden="true">/</span>
          <span>Detalle</span>
        </> : null}
      </nav>
      <nav aria-label="Secciones de administración" className="mb-7 flex flex-wrap gap-2">{links.map(([path, label]) => {
          const href = `${base}/admin${path ? `/${path}` : ""}`;
          const active = path ? pathname.startsWith(href) : pathname === href;

          return (
            <Link
              key={path}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${quiet} ${active ? "border-[var(--team-primary)] bg-[var(--team-primary)] text-white" : ""}`}>{label}</Link>
          );
        })}</nav>
      {children}
    </div>
  );
}
