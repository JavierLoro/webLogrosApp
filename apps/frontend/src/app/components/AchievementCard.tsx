import Link from "next/link"
import Image from "next/image"
import type { Logro } from "@/types/api"
import achievementOverlay from "../../../LockerBoard-marca/surface-system/final/overlays/landscape/lockerboard-overlay-achievement-1600x900.png"

type AchievementCardProps = { achievement?: Logro; logro?: Logro; href: string }

export default function AchievementCard({ achievement, logro, href }: AchievementCardProps) {
  const item = achievement ?? logro
  if (!item) return null
  const category = item.categoria?.trim() || "Sin categoría"
  const icon = item.icono?.trim() || "✦"
  return (
    <Link href={href} className="group block h-full rounded-[1.25rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--team-primary)]">
      <article className="team-surface relative flex h-full min-h-64 flex-col overflow-hidden p-5 text-[var(--team-text)] shadow-[5px_5px_0_rgba(0,0,0,.2)] transition-transform duration-200 group-hover:-translate-y-1 sm:p-6">
        <Image src={achievementOverlay} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="pointer-events-none object-cover" />
        <div className="relative z-10 flex items-start justify-between gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--team-primary)] text-2xl text-[var(--team-on-primary)]" aria-hidden="true">{icon}</span><span className="rounded-full bg-[var(--team-surface-high)] px-3 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--team-muted)]">{category}</span></div>
        <div className="relative z-10 mt-6 flex-1"><p className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--team-muted)]">ID · {item.id}</p><h3 className="team-display mt-2 text-xl font-bold leading-tight tracking-tight">{item.nombre}</h3>{item.descripcion ? <p className="mt-3 text-sm leading-6 text-[var(--team-muted)]">{item.descripcion}</p> : <p className="mt-3 text-sm italic leading-6 text-[var(--team-muted)]">Sin descripción todavía.</p>}</div>
        <div className="relative z-10 mt-6 flex items-end justify-between border-t border-[var(--team-line)] pt-4"><span className="font-mono text-[10px] uppercase tracking-[.16em] text-[var(--team-muted)]">Valor</span><span className="team-display text-2xl font-bold text-[var(--team-orange)]">{item.puntos}<small className="ml-1 font-mono text-[10px] font-normal tracking-wider text-[var(--team-muted)]">pts</small></span></div>
      </article>
    </Link>
  )
}
