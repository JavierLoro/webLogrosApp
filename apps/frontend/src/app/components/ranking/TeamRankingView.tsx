import { AchievementMedia } from "@/app/components/team/AchievementMedia"
import { PlayerAvatar } from "@/app/components/team/PlayerAvatar"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import MaterialIcon, { type MaterialIconName } from "@/app/components/ui/icons/MaterialIcon"
import type { DashboardPlayer, DashboardTotals, TeamRanking } from "@/types/api"

const numberFormatter = new Intl.NumberFormat("es-ES")
const decimalFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
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

type RankingStat = {
  label: string
  value: string
  detail?: string
  icon: MaterialIconName
}

export function TeamRankingView({ ranking }: { ranking: TeamRanking }) {
  const latestByMember = [...ranking.players]
    .filter((player): player is DashboardPlayer & { ultimoLogro: NonNullable<DashboardPlayer["ultimoLogro"]> } => player.ultimoLogro !== null)
    .sort((left, right) => {
      const dateDifference = Date.parse(right.ultimoLogro.fecha) - Date.parse(left.ultimoLogro.fecha)
      return dateDifference || left.id - right.id
    })
    .slice(0, 4)

  if (ranking.players.length === 0) {
    return (
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,61fr)_minmax(20rem,39fr)]">
        <RankingEmpty />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-[var(--lb-panel-gap)]">
          <RankingStats totals={ranking.totals} />
          <RankingBannerPlaceholder />
        </div>
      </div>
    )
  }

  return (
    <div
      className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-[var(--lb-panel-gap)] xl:grid-cols-[minmax(0,61fr)_minmax(20rem,39fr)] xl:items-start"
      data-ranking-layout="61-39"
    >
      <RankingPodium players={ranking.players.slice(0, 3)} className="xl:col-start-1 xl:row-start-1" />
      <RankingStats totals={ranking.totals} className="xl:col-start-2 xl:row-start-1" />
      <RankingTable players={ranking.players} className="xl:col-start-1 xl:row-start-2" />
      <MemberLatestAchievements players={latestByMember} className="xl:col-start-1 xl:row-start-3" />
      <RankingBannerPlaceholder className="xl:col-start-2 xl:row-start-3" />
    </div>
  )
}

function RankingPodium({ players, className = "" }: { players: DashboardPlayer[]; className?: string }) {
  const columnsClass = players.length >= 3
    ? "sm:grid-cols-3"
    : players.length === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-1"

  return (
    <TeamSurface className={`min-w-0 overflow-hidden !p-3 ${className}`.trim()} aria-labelledby="ranking-podium-title">
      <CompactPanelHeading id="ranking-podium-title" title="Podio del equipo" icon="emoji_events" />
      <ol className={`mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:items-end ${columnsClass}`} aria-label="Primeras posiciones del ranking">
        {players.map((player) => (
          <PodiumPlayer key={player.id} player={player} totalPlayers={players.length} />
        ))}
      </ol>
    </TeamSurface>
  )
}

function PodiumPlayer({ player, totalPlayers }: { player: DashboardPlayer; totalPlayers: number }) {
  const isWinner = player.position === 1
  const placementClass = totalPlayers < 3
    ? ""
    : player.position === 1
      ? "sm:col-start-2 sm:row-start-1 sm:h-[13.125rem]"
      : player.position === 2
        ? "sm:col-start-1 sm:row-start-1 sm:h-[11.25rem]"
        : "sm:col-start-3 sm:row-start-1 sm:h-[11.25rem]"
  const toneClass = player.position === 1
    ? "border-[#a17c2f] bg-[color:color-mix(in_srgb,var(--lb-color-warning-surface)_70%,var(--team-surface))]"
    : player.position === 2
      ? "border-[#7d8b93] bg-[color:color-mix(in_srgb,#7d8b93_10%,var(--team-surface))]"
      : "border-[#9b5d35] bg-[color:color-mix(in_srgb,#9b5d35_10%,var(--team-surface))]"

  return (
    <li
      className={`relative flex min-w-0 items-center gap-3 overflow-hidden rounded-[var(--lb-radius-panel)] border px-3 py-3 text-left shadow-[var(--lb-inset-highlight)] sm:flex-col sm:justify-end sm:gap-0 sm:px-2.5 sm:py-2 sm:text-center ${placementClass} ${toneClass}`}
      data-ranking-position={player.position}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-[var(--lb-radius-control)] border border-current bg-[var(--team-surface-low)] font-[var(--lb-font-data)] text-sm font-semibold tabular-nums text-[var(--team-text)] sm:absolute sm:top-2 sm:left-2">
        <span className="sr-only">Posición </span>{player.position}
      </span>
      <span className="shrink-0 sm:hidden">
        <PlayerAvatar name={player.displayName} size="session" />
      </span>
      <span className="hidden sm:inline">
        <PlayerAvatar name={player.displayName} size="identity" className={isWinner ? "" : "!size-20 !text-xl"} />
      </span>
      <div className="min-w-0 flex-1 sm:mt-2 sm:w-full sm:flex-none">
        <p className="w-full truncate text-[length:var(--lb-text-card-title)] font-extrabold leading-[var(--lb-leading-card-title)] text-[var(--team-text)]" title={player.displayName}>
          {player.displayName}
        </p>
        <p className="mt-1 font-[var(--lb-font-data)] text-lg font-semibold leading-6 tabular-nums text-[var(--team-text)]">
          {numberFormatter.format(player.puntos)} <span className="text-xs font-normal text-[var(--team-muted)]">pts</span>
        </p>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--team-muted)]">
          <MaterialIcon name="emoji_events" className="size-3.5 text-[var(--team-primary)]" />
          <span className="font-[var(--lb-font-data)] tabular-nums">{numberFormatter.format(player.logrosCount)}</span>
          {player.logrosCount === 1 ? "logro" : "logros"}
        </p>
      </div>
    </li>
  )
}

function RankingStats({ totals, className = "" }: { totals: DashboardTotals; className?: string }) {
  const average = totals.members > 0 ? totals.awards / totals.members : 0
  const participation = totals.members > 0 ? Math.round((totals.participants / totals.members) * 100) : 0
  const stats: RankingStat[] = [
    { label: "Miembros", value: numberFormatter.format(totals.members), icon: "groups" },
    { label: "Logros en catálogo", value: numberFormatter.format(totals.catalog), icon: "emoji_events" },
    { label: "Puntos acumulados", value: numberFormatter.format(totals.points), icon: "sports_score" },
    {
      label: "Logros otorgados por miembro",
      value: decimalFormatter.format(average),
      detail: `${numberFormatter.format(totals.awards)} otorgamientos`,
      icon: "leaderboard",
    },
    { label: "Logros distintos conseguidos", value: numberFormatter.format(totals.uniqueEarned), icon: "star" },
    {
      label: "Participación",
      value: `${participation}%`,
      detail: `${numberFormatter.format(totals.participants)} de ${numberFormatter.format(totals.members)} miembros`,
      icon: "track_changes",
    },
  ]

  return (
    <TeamSurface className={`min-w-0 !p-3 ${className}`.trim()} aria-labelledby="ranking-stats-title">
      <CompactPanelHeading id="ranking-stats-title" title="Estadísticas generales" icon="leaderboard" />
      <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-2.5">
            <div className="flex items-start gap-2">
              <MaterialIcon name={stat.icon} className="mt-0.5 size-4 shrink-0 text-[var(--team-primary)]" />
              <div className="min-w-0">
                <dt className="text-[0.6875rem] leading-4 text-[var(--team-muted)]">{stat.label}</dt>
                <dd className="mt-1 font-[var(--lb-font-data)] text-[length:var(--lb-text-kpi)] font-semibold leading-[var(--lb-leading-kpi)] tabular-nums text-[var(--team-text)]">{stat.value}</dd>
                {stat.detail ? <dd className="mt-1 text-[0.625rem] leading-4 text-[var(--lb-color-text-tertiary)]">{stat.detail}</dd> : null}
              </div>
            </div>
          </div>
        ))}
      </dl>
    </TeamSurface>
  )
}

function RankingTable({ players, className = "" }: { players: DashboardPlayer[]; className?: string }) {
  return (
    <TeamSurface className={`min-w-0 overflow-hidden !p-0 ${className}`.trim()} aria-labelledby="ranking-table-title">
      <div className="px-4 py-3">
        <CompactPanelHeading
          id="ranking-table-title"
          title="Clasificación completa"
          icon="leaderboard"
          meta={`${players.length} ${players.length === 1 ? "miembro" : "miembros"}`}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="sr-only">Ranking completo de miembros del equipo</caption>
          <thead className="bg-[var(--team-surface-low)] text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--team-muted)]">
            <tr className="h-10 border-y border-[var(--team-line)]">
              <th scope="col" className="w-14 px-3 font-semibold">Pos.</th>
              <th scope="col" className="px-3 font-semibold">Miembro</th>
              <th scope="col" className="w-24 px-3 text-right font-semibold">Puntos</th>
              <th scope="col" className="w-20 px-3 text-right font-semibold">Logros</th>
              <th scope="col" className="w-56 px-3 font-semibold">Último logro</th>
            </tr>
          </thead>
          <tbody>
            {players.map((player) => (
              <tr key={player.id} className="h-12 border-b border-[var(--team-line)] last:border-b-0" data-ranking-row={player.position}>
                <td className="px-3 font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-muted)]">{player.position}</td>
                <th scope="row" className="min-w-0 px-3 font-normal">
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar name={player.displayName} size="table" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[var(--team-text)]" title={player.displayName}>{player.displayName}</span>
                      <span className="block text-[0.625rem] leading-4 text-[var(--team-muted)]">{roleLabels[player.role]}</span>
                    </span>
                  </span>
                </th>
                <td className="px-3 text-right font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--team-text)]">
                  {numberFormatter.format(player.puntos)} <span className="text-[0.625rem] font-normal text-[var(--team-muted)]">pts</span>
                </td>
                <td className="px-3 text-right font-[var(--lb-font-data)] tabular-nums text-[var(--team-text)]">{numberFormatter.format(player.logrosCount)}</td>
                <td className="px-3">
                  {player.ultimoLogro ? (
                    <span className="block min-w-0">
                      <span className="block truncate text-xs font-semibold text-[var(--team-text)]" title={player.ultimoLogro.nombre}>{player.ultimoLogro.nombre}</span>
                      <time dateTime={player.ultimoLogro.fecha} className="block text-[0.625rem] leading-4 text-[var(--team-muted)]">{formatDate(player.ultimoLogro.fecha)}</time>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--team-muted)]">Sin logros todavía</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </TeamSurface>
  )
}

function MemberLatestAchievements({ players, className = "" }: { players: Array<DashboardPlayer & { ultimoLogro: NonNullable<DashboardPlayer["ultimoLogro"]> }>; className?: string }) {
  return (
    <TeamSurface className={`min-w-0 !p-3 ${className}`.trim()} aria-labelledby="ranking-latest-title">
      <CompactPanelHeading id="ranking-latest-title" title="Últimos logros por miembro" icon="emoji_events" />
      {players.length > 0 ? (
        <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {players.map((player) => (
            <li key={player.id} className="flex min-w-0 items-center gap-2 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-2">
              <div className="w-12 shrink-0 overflow-hidden rounded-[var(--lb-radius-control)]">
                <AchievementMedia name={player.ultimoLogro.nombre} variant="square" className="rounded-[var(--lb-radius-control)]" />
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 min-h-8 text-xs font-semibold leading-4 text-[var(--team-text)]" title={player.ultimoLogro.nombre}>{player.ultimoLogro.nombre}</p>
                <p className="mt-0.5 truncate text-[0.6875rem] text-[var(--team-muted)]" title={player.displayName}>{player.displayName}</p>
                <time dateTime={player.ultimoLogro.fecha} className="mt-0.5 block text-[0.6875rem] text-[var(--team-muted)]">{formatDate(player.ultimoLogro.fecha)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-[var(--team-muted)]">Todavía no se han concedido logros.</p>
      )}
    </TeamSurface>
  )
}

function RankingBannerPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`lb-achievement-media aspect-[4/1] w-full min-w-0 rounded-[var(--lb-radius-panel)] ${className}`.trim()}
      aria-hidden="true"
      data-ranking-banner-placeholder="true"
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

function RankingEmpty() {
  return (
    <TeamSurface className="grid min-h-64 min-w-0 place-items-center border-dashed text-center">
      <div>
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-surface-strong)] text-[var(--team-primary)]" aria-hidden="true">
          <MaterialIcon name="leaderboard" className="size-6" />
        </span>
        <h2 className="team-display mt-4 text-2xl font-extrabold text-[var(--team-text)]">Todavía no hay miembros en el ranking</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-[var(--team-muted)]">Las posiciones aparecerán cuando el equipo tenga membresías activas.</p>
      </div>
    </TeamSurface>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "Fecha no disponible" : dateFormatter.format(date)
}
