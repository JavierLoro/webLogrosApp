"use client"

import { useMemo, useState } from "react"
import { PlayerAvatar } from "@/app/components/team/PlayerAvatar"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import MaterialIcon, { type MaterialIconName } from "@/app/components/ui/icons/MaterialIcon"
import type { DashboardPlayer } from "@/types/api"

const numberFormatter = new Intl.NumberFormat("es-ES")
const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
})

const roleLabels: Record<DashboardPlayer["role"], string> = {
  PLAYER: "Jugador",
  TEAM_ADMIN: "Administrador",
}

type RoleFilter = "ALL" | DashboardPlayer["role"]

export function TeamPlayersView({ players, currentUserId }: { players: DashboardPlayer[]; currentUserId: number }) {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL")
  const ownPlayer = players.find((player) => player.id === currentUserId) ?? null
  const admins = players.filter((player) => player.role === "TEAM_ADMIN")
  const normalizedQuery = query.trim().toLocaleLowerCase("es-ES")
  const filteredPlayers = useMemo(
    () => players.filter((player) => {
      const matchesName = normalizedQuery.length === 0
        || player.displayName.toLocaleLowerCase("es-ES").includes(normalizedQuery)
      const matchesRole = roleFilter === "ALL" || player.role === roleFilter
      return matchesName && matchesRole
    }),
    [normalizedQuery, players, roleFilter],
  )
  const totals = {
    members: players.length,
    players: players.filter((player) => player.role === "PLAYER").length,
    admins: admins.length,
    awards: players.reduce((total, player) => total + player.logrosCount, 0),
  }

  return (
    <>
      <PlayersSummary totals={totals} />

      {players.length === 0 ? (
        <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)]">
          <PlayersEmpty />
        </div>
      ) : (
        <div
          className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,40fr)_minmax(0,60fr)] xl:items-start"
          data-players-layout="40-60"
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--lb-panel-gap)]">
            <OwnPlayerPanel player={ownPlayer} />
            <TeamAdminsPanel admins={admins} currentUserId={currentUserId} />
          </div>
          <MembersDirectory
            players={filteredPlayers}
            totalPlayers={players.length}
            currentUserId={currentUserId}
            query={query}
            roleFilter={roleFilter}
            onQueryChange={setQuery}
            onRoleFilterChange={setRoleFilter}
          />
        </div>
      )}

      <PlayersBannerPlaceholder />
    </>
  )
}

function PlayersSummary({ totals }: { totals: { members: number; players: number; admins: number; awards: number } }) {
  const items: Array<{ label: string; value: number; icon: MaterialIconName }> = [
    { label: "Miembros", value: totals.members, icon: "groups" },
    { label: "Jugadores", value: totals.players, icon: "sports_martial_arts" },
    { label: "Administradores", value: totals.admins, icon: "settings" },
    { label: "Logros otorgados", value: totals.awards, icon: "emoji_events" },
  ]

  return (
    <dl className="mt-4 grid min-w-0 grid-cols-2 overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] sm:grid-cols-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex min-h-20 min-w-0 items-center gap-3 border-[var(--team-line)] px-3 py-3 sm:px-4 ${index < 2 ? "border-b" : ""} ${index % 2 === 0 ? "border-r" : ""} sm:border-b-0 sm:border-r sm:last:border-r-0`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-surface-low)] text-[var(--team-primary)]" aria-hidden="true">
            <MaterialIcon name={item.icon} className="size-4.5" />
          </span>
          <div className="min-w-0">
            <dt className="truncate text-[0.6875rem] leading-4 text-[var(--team-muted)]">{item.label}</dt>
            <dd className="mt-0.5 font-[var(--lb-font-data)] text-[length:var(--lb-text-kpi)] font-semibold leading-[var(--lb-leading-kpi)] tabular-nums text-[var(--team-text)]">
              {numberFormatter.format(item.value)}
            </dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

function OwnPlayerPanel({ player }: { player: DashboardPlayer | null }) {
  return (
    <TeamSurface className="min-w-0 overflow-hidden !p-0" aria-labelledby="own-player-title">
      <div className="relative flex aspect-[2/1] min-h-[18rem] min-w-0 flex-col overflow-hidden p-4 sm:min-h-[16rem] xl:min-h-0">
        <div className="lb-achievement-media absolute inset-0 h-full w-full rounded-none border-0" aria-hidden="true" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--team-surface)_24%,transparent),color-mix(in_srgb,var(--team-surface)_94%,transparent)_70%)]" aria-hidden="true" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <CompactPanelHeading id="own-player-title" title="Tu perfil en el equipo" icon="account_circle" />
          {player ? (
            <div className="mt-auto min-w-0">
              <div className="flex min-w-0 items-end gap-3">
                <PlayerAvatar name={player.displayName} size="identity" className="shrink-0" />
                <div className="min-w-0 pb-1">
                  <span className="inline-flex min-h-6 items-center rounded-full border border-[var(--team-line)] bg-[var(--team-surface)] px-2 text-[0.6875rem] font-semibold text-[var(--team-primary)]">Tú</span>
                  <p className="mt-1 truncate text-[length:var(--lb-text-card-title)] font-extrabold leading-[var(--lb-leading-card-title)] text-[var(--team-text)]" title={player.displayName}>
                    {player.displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--team-muted)]">{roleLabels[player.role]}</p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 overflow-hidden rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[color:color-mix(in_srgb,var(--team-surface)_88%,transparent)]">
                <PlayerMetric label="Posición" value={`#${numberFormatter.format(player.position)}`} />
                <PlayerMetric label="Puntos" value={numberFormatter.format(player.puntos)} />
                <PlayerMetric label="Logros" value={numberFormatter.format(player.logrosCount)} />
              </dl>
              <p className="mt-2 text-[0.6875rem] text-[var(--team-muted)]">
                Miembro desde <time dateTime={player.joinedAt}>{formatDate(player.joinedAt)}</time>
              </p>
            </div>
          ) : (
            <p className="mt-auto max-w-sm text-sm leading-6 text-[var(--team-muted)]">Tu membresía no aparece todavía en el directorio del equipo.</p>
          )}
        </div>
      </div>
    </TeamSurface>
  )
}

function PlayerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-[var(--team-line)] px-2 py-2 text-center last:border-r-0">
      <dt className="truncate text-[0.625rem] leading-4 text-[var(--team-muted)]">{label}</dt>
      <dd className="font-[var(--lb-font-data)] text-base font-semibold leading-5 tabular-nums text-[var(--team-text)]">{value}</dd>
    </div>
  )
}

function TeamAdminsPanel({ admins, currentUserId }: { admins: DashboardPlayer[]; currentUserId: number }) {
  return (
    <TeamSurface className="min-w-0 !p-3" aria-labelledby="team-admins-title">
      <CompactPanelHeading
        id="team-admins-title"
        title="Administración del equipo"
        icon="settings"
        meta={`${admins.length} ${admins.length === 1 ? "persona" : "personas"}`}
      />
      {admins.length > 0 ? (
        <ul className="mt-2 divide-y divide-[var(--team-line)]">
          {admins.map((admin) => (
            <li key={admin.id} className="flex min-h-16 min-w-0 items-center gap-3 py-2 first:pt-1 last:pb-1">
              <PlayerAvatar name={admin.displayName} size="session" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--team-text)]" title={admin.displayName}>
                  {admin.displayName}{admin.id === currentUserId ? <span className="ml-1 text-xs font-normal text-[var(--team-primary)]">(Tú)</span> : null}
                </p>
                <p className="text-[0.6875rem] text-[var(--team-muted)]">Administrador</p>
              </div>
              <div className="shrink-0 text-right text-[0.6875rem] leading-4 text-[var(--team-muted)]">
                <p><span className="font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-text)]">{numberFormatter.format(admin.puntos)}</span> pts</p>
                <p><span className="font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-text)]">{numberFormatter.format(admin.logrosCount)}</span> logros</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[var(--team-muted)]">No hay administradores visibles en el directorio.</p>
      )}
    </TeamSurface>
  )
}

type MembersDirectoryProps = {
  players: DashboardPlayer[]
  totalPlayers: number
  currentUserId: number
  query: string
  roleFilter: RoleFilter
  onQueryChange: (value: string) => void
  onRoleFilterChange: (value: RoleFilter) => void
}

function MembersDirectory({ players, totalPlayers, currentUserId, query, roleFilter, onQueryChange, onRoleFilterChange }: MembersDirectoryProps) {
  const hasFilters = query.trim().length > 0 || roleFilter !== "ALL"

  function clearFilters() {
    onQueryChange("")
    onRoleFilterChange("ALL")
  }

  return (
    <TeamSurface className="min-w-0 overflow-hidden !p-0" aria-labelledby="members-directory-title">
      <div className="min-w-0 px-4 pt-3 pb-2">
        <CompactPanelHeading
          id="members-directory-title"
          title="Miembros del equipo"
          icon="groups"
          meta={`${players.length} de ${totalPlayers}`}
        />
        <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 lg:grid-cols-[minmax(12rem,1fr)_auto] lg:items-center">
          <label className="relative block min-w-0">
            <span className="sr-only">Buscar miembro por nombre</span>
            <MaterialIcon name="account_circle" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--team-muted)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por nombre"
              className="min-h-11 w-full rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] pr-3 pl-9 text-sm text-[var(--team-text)] outline-none placeholder:text-[var(--team-muted)] focus-visible:border-[var(--team-primary)] focus-visible:ring-2 focus-visible:ring-[var(--team-primary-soft)]"
            />
          </label>
          <div className="flex min-w-0 flex-wrap gap-1" aria-label="Filtrar miembros por rol">
            <FilterButton active={roleFilter === "ALL"} onClick={() => onRoleFilterChange("ALL")}>Todos</FilterButton>
            <FilterButton active={roleFilter === "PLAYER"} onClick={() => onRoleFilterChange("PLAYER")}>Jugadores</FilterButton>
            <FilterButton active={roleFilter === "TEAM_ADMIN"} onClick={() => onRoleFilterChange("TEAM_ADMIN")}>Administradores</FilterButton>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{players.length} miembros visibles</p>
      </div>

      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
          <caption className="sr-only">Directorio de miembros del equipo</caption>
          <thead className="bg-[var(--team-surface-low)] text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--team-muted)]">
            <tr className="h-10 border-y border-[var(--team-line)]">
              <th scope="col" className="w-14 px-3 font-semibold">Pos.</th>
              <th scope="col" className="px-3 font-semibold">Miembro</th>
              <th scope="col" className="w-32 px-3 font-semibold">Rol</th>
              <th scope="col" className="w-24 px-3 text-right font-semibold">Puntos</th>
              <th scope="col" className="w-20 px-3 text-right font-semibold">Logros</th>
            </tr>
          </thead>
          <tbody>
            {players.length > 0 ? players.map((player) => (
              <tr
                key={player.id}
                className={`h-12 border-b border-[var(--team-line)] last:border-b-0 ${player.id === currentUserId ? "bg-[var(--team-primary-soft)]" : ""}`}
                data-player-row={player.position}
              >
                <td className="px-3 font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-muted)]">{player.position}</td>
                <th scope="row" className="min-w-0 px-3 font-normal">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar name={player.displayName} size="table" />
                    <span className="min-w-0">
                      <span className="block max-w-52 truncate font-semibold text-[var(--team-text)]" title={player.displayName}>{player.displayName}</span>
                      <span className="block text-[0.625rem] leading-4 text-[var(--team-muted)]">
                        {player.id === currentUserId ? "Tú · " : ""}Desde <time dateTime={player.joinedAt}>{formatDate(player.joinedAt)}</time>
                      </span>
                    </span>
                  </span>
                </th>
                <td className="px-3 text-xs text-[var(--team-muted)]">{roleLabels[player.role]}</td>
                <td className="px-3 text-right font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-text)]">
                  {numberFormatter.format(player.puntos)} <span className="text-[0.625rem] font-normal text-[var(--team-muted)]">pts</span>
                </td>
                <td className="px-3 text-right font-[var(--lb-font-data)] tabular-nums text-[var(--team-text)]">{numberFormatter.format(player.logrosCount)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <p className="font-semibold text-[var(--team-text)]">No hay miembros que coincidan</p>
                  <p className="mt-1 text-sm text-[var(--team-muted)]">Prueba con otro nombre o cambia el filtro de rol.</p>
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface)] px-4 py-2 text-sm font-semibold text-[var(--team-text)] hover:border-[var(--team-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </TeamSurface>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] ${active ? "border-[var(--team-primary)] bg-[var(--team-primary)] text-white" : "border-[var(--team-line)] bg-[var(--team-surface-low)] text-[var(--team-muted)] hover:text-[var(--team-text)]"}`}
    >
      {children}
    </button>
  )
}

function PlayersBannerPlaceholder() {
  return (
    <div
      className="lb-achievement-media mt-[var(--lb-panel-gap)] aspect-[4/1] min-h-20 w-full min-w-0 rounded-[var(--lb-radius-panel)] sm:aspect-[8/1] xl:aspect-[13/1]"
      aria-hidden="true"
      data-players-banner-placeholder="true"
    />
  )
}

function CompactPanelHeading({ id, title, icon, meta }: { id: string; title: string; icon: MaterialIconName; meta?: string }) {
  return (
    <div className="flex min-h-6 min-w-0 items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <MaterialIcon name={icon} className="size-4 shrink-0 text-[var(--team-primary)]" />
        <h2 id={id} className="team-display truncate text-[length:var(--lb-text-section-title)] font-extrabold leading-[var(--lb-leading-section-title)] text-[var(--team-text)]">
          {title}
        </h2>
      </div>
      {meta ? <p className="shrink-0 text-xs text-[var(--team-muted)]">{meta}</p> : null}
    </div>
  )
}

function PlayersEmpty() {
  return (
    <TeamSurface className="grid min-h-64 min-w-0 place-items-center border-dashed text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-surface-strong)] text-[var(--team-primary)]" aria-hidden="true">
          <MaterialIcon name="groups" className="size-6" />
        </span>
        <h2 className="team-display mt-4 text-2xl font-extrabold text-[var(--team-text)]">Todavía no hay miembros en el equipo</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--team-muted)]">El directorio aparecerá cuando existan membresías activas.</p>
      </div>
    </TeamSurface>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "fecha no disponible" : dateFormatter.format(date)
}
