import Link from "next/link"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import { PlayerAvatar } from "./PlayerAvatar"
import type { TeamRole } from "@/types/api"

type TeamIdentityProps = {
  teamName: string
  slug: string
  userName?: string
  role?: TeamRole
  loading?: boolean
  compact?: boolean
}

const roleLabels: Record<TeamRole, string> = {
  PLAYER: "Jugador",
  TEAM_ADMIN: "Administrador",
}

export function TeamIdentity({ teamName, slug, userName, role, loading = false, compact = false }: TeamIdentityProps) {
  const teamPath = `/equipos/${slug}`

  if (compact) {
    return (
      <Link
        href={teamPath}
        className="group grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] px-2.5 py-3 hover:border-[var(--team-outline-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
      >
        <span className="row-span-2 grid size-8 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-primary)] text-white" aria-hidden="true">
          <MaterialIcon name="sports_score" className="size-5" />
        </span>
        <span className="min-w-0 self-end font-mono text-[0.5625rem] uppercase leading-none tracking-[0.08em] text-[var(--team-muted)]">Equipo actual</span>
        <MaterialIcon name="arrow_forward" className="row-span-2 size-3.5 shrink-0 text-[var(--team-muted)]" />
        <span className="min-w-0 self-start overflow-hidden text-ellipsis whitespace-nowrap text-[0.8125rem] font-semibold leading-tight tracking-[-0.015em] text-[var(--team-text)]">{loading ? "Cargando…" : teamName}</span>
      </Link>
    )
  }

  return (
    <header className="lb-team-identity-header border-b border-[var(--team-line)] bg-[var(--lb-color-bg-shell)] px-[var(--lb-page-gutter)]">
      <div className="lb-team-identity-header__content flex min-h-[var(--lb-tenant-header-height)] w-full items-center justify-between gap-4 py-4">
        <Link
          href={teamPath}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-[var(--lb-radius-control)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lb-color-focus)]"
        >
          <span className="grid size-14 shrink-0 place-items-center rounded-[var(--lb-radius-control)] border border-[var(--team-outline-strong)] bg-[var(--team-surface-low)] text-[var(--team-primary)]" aria-hidden="true">
            <MaterialIcon name="sports_score" className="size-8" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--team-muted)]">Espacio del equipo</span>
            <span className="team-display mt-1 block truncate text-[var(--lb-text-team-identity)] font-black leading-[var(--lb-leading-team-identity)] tracking-[-0.035em] text-[var(--team-text)]">
              {loading ? "Cargando equipo…" : teamName}
            </span>
          </span>
        </Link>

        <div className="hidden min-w-0 max-w-72 items-center gap-3 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface)] px-3 py-2 lg:flex" aria-label="Contexto de sesión">
          <PlayerAvatar name={userName} size="session" />
          <span>
            <span className="block max-w-48 truncate text-sm font-semibold text-[var(--team-text)]">{loading ? "Cargando identidad…" : userName ?? "Identidad no disponible"}</span>
            <span className="block text-xs text-[var(--team-muted)]">{role ? roleLabels[role] : "Verificando acceso"}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
