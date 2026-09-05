import Image from "next/image"
import dataOverlay from "../../../../LockerBoard-marca/surface-system/final/overlays/landscape/lockerboard-overlay-container-data-1600x900.png"

type TeamQuickStatsProps = {
  total: number
  points: number
  categories: number
}

const stats = [
  { key: "total", label: "Logros", tone: "var(--team-primary-soft)" },
  { key: "points", label: "Puntos posibles", tone: "var(--team-orange)" },
  { key: "categories", label: "Categorías", tone: "var(--team-green)" },
] as const

export function TeamQuickStats(props: TeamQuickStatsProps) {
  return (
    <section className="team-surface relative flex min-h-80 flex-col overflow-hidden p-6 sm:p-8">
      <Image src={dataOverlay} alt="" fill sizes="(min-width: 1280px) 33vw, 100vw" className="pointer-events-none object-cover" />
      <header className="relative z-10 border-b border-[var(--team-line)] pb-4">
        <p className="team-eyebrow">Datos del catálogo</p>
        <h2 className="team-display text-2xl font-extrabold">Vista rápida</h2>
      </header>
      <dl className="relative z-10 mt-5 grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
        {stats.map((stat) => (
          <div className="flex items-end justify-between gap-4 rounded-2xl bg-[var(--team-surface-low)] px-4 py-3" key={stat.key}>
            <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--team-muted)]">{stat.label}</dt>
            <dd className="team-display text-3xl font-black leading-none" style={{ color: stat.tone }}>{props[stat.key]}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
