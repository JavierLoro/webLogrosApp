import Link from "next/link"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import type { TeamSummary } from "@/types/api"
import "./onboarding-surfaces.css"

export function TeamsOverview({ teams }: { teams: TeamSummary[] }) {
  if (teams.length === 0) return <TeamsEmpty />

  return (
    <>
      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {teams.map((team) => <TeamCard key={team.slug} team={team} />)}
        <JoinTeamCard />
      </div>
      <TeamsLowerBand />
    </>
  )
}

function TeamCard({ team }: { team: TeamSummary }) {
  return (
    <Link
      href={`/equipos/${team.slug}`}
      className="lb-onboarding-surface lb-onboarding-surface--interactive group flex min-h-72 min-w-0 flex-col p-5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--lb-color-focus)] sm:min-h-[22rem] lg:min-h-[26rem]"
    >
      <div aria-hidden="true" className="grid h-20 w-full place-items-center sm:h-32">
        <span className="grid size-12 place-items-center rounded-full border border-[var(--lb-color-border-strong)] bg-[radial-gradient(circle_at_30%_25%,rgba(237,7,25,0.35),transparent_55%),var(--lb-color-bg-deep)] [font-family:var(--lb-font-data)] text-sm font-semibold tracking-[0.08em] text-[var(--lb-color-text-primary)] sm:size-20 sm:text-lg">
          {initialsFor(team.nombre)}
        </span>
      </div>
      <h2 className="mt-4 break-words [font-family:var(--lb-font-display)] text-3xl font-bold leading-tight tracking-[-0.025em] text-[var(--lb-color-text-primary)]" title={team.nombre}>{team.nombre}</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--lb-color-text-secondary)]">Deporte no disponible</p>
      <div className="mt-4 border-t border-[var(--lb-color-border)] pt-4">
        {team.stats ? (
          <dl className="flex gap-8">
            <div className="flex flex-col-reverse gap-1">
              <dt className="text-xs text-[var(--lb-color-text-secondary)]">Logros</dt>
              <dd className="[font-family:var(--lb-font-data)] text-xl">{team.stats.achievements}</dd>
            </div>
            <div className="flex flex-col-reverse gap-1">
              <dt className="text-xs text-[var(--lb-color-text-secondary)]">Jugadores</dt>
              <dd className="[font-family:var(--lb-font-data)] text-xl">{team.stats.players}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--lb-color-text-secondary)]">Estadísticas no disponibles</p>
        )}
      </div>
      <span className="mt-auto self-end pt-4 text-[var(--lb-color-accent-hover)] transition-transform group-hover:translate-x-1" aria-hidden="true">
        <MaterialIcon name="arrow_forward" className="size-5" />
      </span>
    </Link>
  )
}

function JoinTeamCard() {
  return (
    <Link
      href="/unirse"
      className="lb-onboarding-surface lb-onboarding-surface--join lb-onboarding-surface--interactive group grid min-h-36 min-w-0 place-items-center p-5 text-center focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--lb-color-focus)] sm:min-h-[22rem] lg:min-h-[26rem]"
    >
      <span>
        <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full border border-[var(--lb-color-border-strong)] text-2xl text-[var(--lb-color-text-primary)] group-hover:border-[var(--lb-color-accent)]">+</span>
        <span className="mt-4 block [font-family:var(--lb-font-display)] text-xl font-bold text-[var(--lb-color-text-primary)]">Unirse a un equipo</span>
        <span className="mt-2 block text-sm leading-5 text-[var(--lb-color-text-secondary)]">Usa el código de una invitación.</span>
      </span>
    </Link>
  )
}

function TeamsLowerBand() {
  return (
    <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <section className="lb-onboarding-surface lb-onboarding-surface--info flex min-w-0 items-center gap-4 p-5" aria-labelledby="request-team-title">
          <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center text-[var(--lb-color-text-primary)]">
            <MaterialIcon name="groups" className="size-14" />
          </span>
          <div className="min-w-0">
            <h2 id="request-team-title" className="[font-family:var(--lb-font-display)] text-lg font-bold text-[var(--lb-color-text-primary)]">¿Aún no tienes equipo?</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--lb-color-text-secondary)]">Solicita la creación de un espacio oficial para tu equipo.</p>
        <Link href="/solicitar-acceso" className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--lb-radius-control)] border border-[var(--lb-color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--lb-color-text-primary)] hover:border-[var(--lb-color-accent)] hover:bg-[var(--lb-color-surface-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]">
          Solicitar equipo
          <span aria-hidden="true"><MaterialIcon name="arrow_forward" className="size-4" /></span>
        </Link>
          </div>
      </section>
      <div aria-hidden="true" className="lb-onboarding-surface lb-onboarding-surface--media relative min-h-28 overflow-hidden">
        <span className="absolute right-6 bottom-5 max-w-[13ch] [font-family:var(--lb-font-display)] text-xl font-bold leading-[1.05] tracking-[-0.02em] text-[var(--lb-color-text-primary)] uppercase">Más equipos. Más historias.</span>
      </div>
    </div>
  )
}

function TeamsEmpty() {
  return (
    <section className="lb-onboarding-surface lb-onboarding-surface--join mt-7 px-5 py-14 text-center" aria-labelledby="teams-empty-title">
      <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-surface-raised)] text-[var(--lb-color-accent-hover)]">
        <MaterialIcon name="groups" className="size-6" />
      </span>
      <h2 id="teams-empty-title" className="mt-4 [font-family:var(--lb-font-display)] text-2xl font-extrabold text-[var(--lb-color-text-primary)]">Todavía no perteneces a un equipo</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--lb-color-text-secondary)]">Puedes usar una invitación existente o solicitar un espacio oficial.</p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link href="/unirse" className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] bg-[var(--lb-color-accent)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--lb-color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]">Usar una invitación</Link>
        <Link href="/solicitar-acceso" className="inline-flex min-h-11 items-center justify-center rounded-[var(--lb-radius-control)] border border-[var(--lb-color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--lb-color-text-primary)] hover:bg-[var(--lb-color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]">Solicitar equipo</Link>
      </div>
    </section>
  )
}

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "LB"
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase("es-ES")
  return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toLocaleUpperCase("es-ES")
}
