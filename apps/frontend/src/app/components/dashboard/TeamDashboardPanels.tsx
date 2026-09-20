import Link from "next/link"
import { AchievementMedia } from "@/app/components/team/AchievementMedia"
import { PlayerAvatar } from "@/app/components/team/PlayerAvatar"
import { SectionHeader } from "@/app/components/team/SectionHeader"
import { TeamSurface } from "@/app/components/team/TeamPrimitives"
import MaterialIcon, { type MaterialIconName } from "@/app/components/ui/icons/MaterialIcon"
import type { DashboardAchievement, DashboardAward, DashboardPlayer, DashboardTotals, TeamDashboard } from "@/types/api"

const numberFormatter = new Intl.NumberFormat("es-ES")
const decimalFormatter = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short", timeZone: "Europe/Madrid" })
const relativeFormatter = new Intl.RelativeTimeFormat("es-ES", { numeric: "always" })
const PARTICIPATION_SEGMENTS = 20

const podiumPlateClasses = [
  "border-[#a17c2f] bg-[#b99345] text-[#071014]",
  "border-[#7d8b93] bg-[#8f9aa0] text-[#071014]",
  "border-[#9b5d35] bg-[#a8663d] text-white",
] as const

function formatNumber(value: number) {
  return numberFormatter.format(value)
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value))
}

function formatRelativeDate(value: string) {
  const difference = new Date(value).getTime() - Date.now()
  const absolute = Math.abs(difference)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (absolute < hour) return relativeFormatter.format(Math.round(difference / minute), "minute")
  if (absolute < day) return relativeFormatter.format(Math.round(difference / hour), "hour")
  return relativeFormatter.format(Math.round(difference / day), "day")
}

type PanelProps = {
  className?: string
}

export function TeamParticipationPanel({ totals, className = "" }: PanelProps & { totals: DashboardTotals }) {
  const participation = totals.members === 0 ? 0 : Math.round((totals.participants / totals.members) * 100)
  const activeSegments = Math.round((participation / 100) * PARTICIPATION_SEGMENTS)
  const summary = [
    { label: "En catálogo", value: totals.catalog },
    { label: "Otorgados", value: totals.awards },
    { label: "Conseguidos", value: totals.uniqueEarned },
    { label: "Puntos", value: totals.points },
  ]

  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col overflow-hidden ${className}`.trim()}>
      <SectionHeader title="Participación del equipo" icon={<MaterialIcon name="groups" className="size-5" />} />
      <div className="mt-3 flex flex-1 flex-col justify-between">
        <div>
          <p className="font-[var(--lb-font-data)] text-[clamp(4.5rem,7vw,6rem)] font-semibold leading-[0.85] tracking-[-0.075em] tabular-nums text-[var(--team-text)]">
            {participation}%
          </p>
          <p className="mt-2 max-w-[34ch] text-sm leading-5 text-[var(--team-muted)]">
            {totals.participants} de {totals.members} miembros han conseguido al menos un logro.
          </p>
        </div>

        <div className="mt-3">
          <div
            role="meter"
            aria-label="Participación de miembros con al menos un logro"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={participation}
            aria-valuetext={`${totals.participants} de ${totals.members} miembros`}
            className="h-3 overflow-hidden rounded-[var(--lb-radius-status)]"
          >
            <span aria-hidden="true" className="flex h-full gap-1">
              {Array.from({ length: PARTICIPATION_SEGMENTS }, (_, index) => (
                <span
                  key={index}
                  className={`h-full min-w-0 flex-1 -skew-x-12 rounded-[1px] ${index < activeSegments ? "bg-[var(--team-primary)]" : "bg-[var(--team-surface-strong)]"}`}
                />
              ))}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 border-t border-[var(--team-line)] sm:grid-cols-4">
            {summary.map((item, index) => (
              <div
                key={item.label}
                className={`flex min-w-0 flex-col px-3 py-3 first:pl-0 sm:border-r sm:border-[var(--team-line)] sm:last:border-r-0 ${index === 2 ? "sm:pl-3" : ""}`.trim()}
              >
                <dt className="order-2 mt-1.5 text-[0.6875rem] font-semibold uppercase leading-4 tracking-[0.08em] text-[var(--team-muted)]">
                  {item.label}
                </dt>
                <dd className="order-1 font-[var(--lb-font-data)] text-xl font-semibold leading-none tabular-nums text-[var(--team-text)]">
                  {formatNumber(item.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </TeamSurface>
  )
}

type CompactMetric = {
  label: string
  value: string
  icon: MaterialIconName
}

export function TeamStatsPanel({ dashboard, className = "" }: PanelProps & { dashboard: TeamDashboard }) {
  const { totals, mostEarned, rarestEarned } = dashboard
  const average = totals.members === 0 ? 0 : totals.awards / totals.members
  const metrics: CompactMetric[] = [
    { label: "Miembros", value: formatNumber(totals.members), icon: "groups" },
    { label: "Logros otorgados", value: formatNumber(totals.awards), icon: "emoji_events" },
    { label: "Puntos acumulados", value: formatNumber(totals.points), icon: "track_changes" },
    { label: "Logros por miembro", value: decimalFormatter.format(average), icon: "leaderboard" },
  ]

  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col ${className}`.trim()}>
      <SectionHeader title="Estadísticas del equipo" />
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex min-w-0 items-center gap-2.5 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--lb-radius-control)] border border-[var(--team-line)] text-[var(--team-muted)]" aria-hidden="true">
              <MaterialIcon name={metric.icon} className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col">
              <dt className="order-2 mt-1 text-[0.6875rem] leading-4 text-[var(--team-muted)]">{metric.label}</dt>
              <dd className="order-1 font-[var(--lb-font-data)] text-xl font-semibold leading-none tabular-nums text-[var(--team-text)]">{metric.value}</dd>
            </div>
          </div>
        ))}
      </dl>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-2">
        <AchievementHighlight label="Más conseguido" achievement={mostEarned} />
        <AchievementHighlight label="Más raro" achievement={rarestEarned} />
      </div>
    </TeamSurface>
  )
}

function AchievementHighlight({ label, achievement }: { label: string; achievement: DashboardAchievement | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-2.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--team-surface-strong)] text-[var(--team-primary)]" aria-hidden="true">
        <MaterialIcon name="emoji_events" className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-[0.6875rem] leading-4 text-[var(--team-muted)]">{label}</p>
        {achievement ? (
          <>
            <p className="truncate text-sm font-semibold text-[var(--team-text)]" title={achievement.nombre}>{achievement.nombre}</p>
            <p className="mt-0.5 text-xs text-[var(--team-muted)]">{achievement.holdersCount} {achievement.holdersCount === 1 ? "miembro" : "miembros"}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-[var(--team-muted)]">Sin datos todavía</p>
        )}
      </div>
    </div>
  )
}

export function RecentAwardsPanel({ awards, className = "" }: PanelProps & { awards: DashboardAward[] }) {
  const visibleAwards = awards.slice(0, 5)

  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col ${className}`.trim()}>
      <SectionHeader title="Actividad reciente" />
      {visibleAwards.length > 0 ? (
        <ul className="mt-1">
          {visibleAwards.map((award) => (
            <li key={award.id} className="flex h-12 min-w-0 items-center gap-3 border-b border-[var(--team-line)] last:border-b-0">
              <PlayerAvatar name={award.user.displayName} size="table" />
              <div className="min-w-0">
                <p
                  className="truncate text-sm leading-5 text-[var(--team-text)]"
                  title={`${award.user.displayName} consiguió ${award.logro.nombre}`}
                >
                  <strong className="font-semibold">{award.user.displayName}</strong> consiguió {award.logro.nombre}
                </p>
                <time dateTime={award.fecha} className="block text-[0.6875rem] leading-4 text-[var(--team-muted)]">{formatRelativeDate(award.fecha)}</time>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyPanelMessage icon="emoji_events">Todavía no se han concedido logros.</EmptyPanelMessage>
      )}
    </TeamSurface>
  )
}

export function RecentAchievementsPanel({ achievements, slug, className = "" }: PanelProps & { achievements: DashboardAchievement[]; slug: string }) {
  const action = (
    <Link
      href={`/equipos/${slug}/logros`}
      className="inline-flex min-h-11 items-center gap-1 rounded-[var(--lb-radius-control)] px-1 text-sm text-[var(--team-primary)] hover:text-[var(--team-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
    >
      Ver todos <MaterialIcon name="arrow_forward" className="size-4" />
    </Link>
  )

  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col ${className}`.trim()}>
      <SectionHeader title="Últimos logros añadidos" action={action} />
      {achievements.length > 0 ? (
        <div className="mt-2 grid flex-1 gap-2 sm:grid-cols-3">
          {achievements.slice(0, 3).map((achievement) => (
            <Link
              key={achievement.id}
              href={`/equipos/${slug}/logros/${achievement.id}`}
              className="group flex min-w-0 flex-col rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] p-2 hover:border-[var(--team-outline-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
            >
              <AchievementMedia name={achievement.nombre} variant="landscape" />
              <p className="mt-2 truncate text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--team-primary)]">{achievement.categoria || "Logro"}</p>
              <h3 className="team-display mt-1 line-clamp-2 text-base font-extrabold leading-[1.1] text-[var(--team-text)]">{achievement.nombre}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-[var(--team-muted)]">{achievement.descripcion || "Sin descripción"}</p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-2 text-xs text-[var(--team-muted)]">
                <time dateTime={achievement.createdAt}>{formatDate(achievement.createdAt)}</time>
                <span className="font-[var(--lb-font-data)] font-semibold tabular-nums text-[var(--lb-color-warning)]">{formatNumber(achievement.puntos)} pts</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyPanelMessage icon="emoji_events">Aún no hay logros en el catálogo.</EmptyPanelMessage>
      )}
    </TeamSurface>
  )
}

export function PersonalSummaryPanel({ summary, className = "" }: PanelProps & { summary: TeamDashboard["me"] }) {
  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col ${className}`.trim()}>
      <SectionHeader title="Tu resumen" icon={<MaterialIcon name="sports_score" className="size-5" />} />
      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--team-muted)]">Posición en el equipo</p>
          <p className="mt-1 font-[var(--lb-font-data)] text-6xl font-semibold leading-none tabular-nums text-[var(--team-primary)]">#{summary.position}</p>
        </div>
        <dl className="mt-5 grid grid-cols-2 border-t border-[var(--team-line)]">
          <div className="border-r border-[var(--team-line)] py-4 pr-3">
            <dt className="text-xs text-[var(--team-muted)]">Puntos</dt>
            <dd className="mt-1 font-[var(--lb-font-data)] text-2xl font-semibold tabular-nums text-[var(--team-text)]">{formatNumber(summary.puntos)}</dd>
          </div>
          <div className="py-4 pl-3">
            <dt className="text-xs text-[var(--team-muted)]">Logros</dt>
            <dd className="mt-1 font-[var(--lb-font-data)] text-2xl font-semibold tabular-nums text-[var(--team-text)]">{formatNumber(summary.logrosCount)}</dd>
          </div>
        </dl>
      </div>
    </TeamSurface>
  )
}

export function TopPlayersPanel({ players, slug, className = "" }: PanelProps & { players: DashboardPlayer[]; slug: string }) {
  const action = (
    <Link
      href={`/equipos/${slug}/ranking`}
      className="inline-flex min-h-11 items-center gap-1 rounded-[var(--lb-radius-control)] px-1 text-sm text-[var(--team-primary)] hover:text-[var(--team-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
    >
      Ver ranking <MaterialIcon name="arrow_forward" className="size-4" />
    </Link>
  )

  return (
    <TeamSurface className={`flex h-full min-w-0 flex-col ${className}`.trim()}>
      <SectionHeader title="Top 3 jugadores" action={action} />
      {players.length > 0 ? (
        <ol className="mt-1">
          {players.slice(0, 3).map((player, index) => (
            <li key={player.id} className="grid h-16 min-w-0 grid-cols-[3rem_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--team-line)] last:border-b-0">
              <span
                className={`grid size-12 place-items-center rounded-[var(--lb-radius-control)] border font-[var(--lb-font-data)] text-xl font-semibold tabular-nums ${podiumPlateClasses[index] ?? "border-[var(--team-line)] bg-[var(--team-surface-strong)] text-[var(--team-text)]"}`}
                aria-label={`Posición ${player.position}`}
              >
                {player.position}
              </span>
              <PlayerAvatar name={player.displayName} size="session" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--team-text)]" title={player.displayName}>{player.displayName}</p>
                <p className="mt-0.5 text-xs text-[var(--team-muted)]">{formatNumber(player.puntos)} puntos</p>
              </div>
              <div className="flex items-center gap-1.5 text-right">
                <MaterialIcon name="emoji_events" className="size-5 shrink-0 text-[var(--team-primary)]" />
                <div>
                  <p className="font-[var(--lb-font-data)] text-lg font-semibold leading-none tabular-nums text-[var(--team-text)]">{formatNumber(player.logrosCount)}</p>
                  <p className="mt-1 text-[0.6875rem] text-[var(--team-muted)]">logros</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyPanelMessage icon="leaderboard">Todavía no hay miembros en el ranking.</EmptyPanelMessage>
      )}
    </TeamSurface>
  )
}

function EmptyPanelMessage({ icon, children }: { icon: MaterialIconName; children: string }) {
  return (
    <div className="grid flex-1 place-items-center py-8 text-center">
      <div>
        <span className="mx-auto grid size-11 place-items-center rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] text-[var(--team-muted)]" aria-hidden="true">
          <MaterialIcon name={icon} className="size-5" />
        </span>
        <p className="mt-3 text-sm text-[var(--team-muted)]">{children}</p>
      </div>
    </div>
  )
}
