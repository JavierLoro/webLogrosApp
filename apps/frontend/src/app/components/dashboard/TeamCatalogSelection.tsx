import Link from "next/link"
import Image from "next/image"
import type { Logro } from "@/types/api"
import achievementOverlay from "../../../../LockerBoard-marca/surface-system/final/overlays/landscape/lockerboard-overlay-achievement-1600x900.png"

export function TeamCatalogSelection({ achievements, slug }: { achievements: Logro[]; slug: string }) {
  return (
    <section>
      <header className="mb-4 flex items-end justify-between gap-4 border-b border-[var(--team-line)] pb-3">
        <div>
          <p className="team-eyebrow">Una muestra del catálogo</p>
          <h2 className="team-display text-2xl font-extrabold sm:text-3xl">Logros del equipo</h2>
        </div>
        <Link className="shrink-0 text-sm font-bold text-[var(--team-primary-soft)] hover:text-[var(--team-text)]" href={`/equipos/${slug}/logros`}>Ver todas →</Link>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {achievements.map((achievement) => (
          <Link
            className="team-surface group relative flex min-h-52 flex-col justify-between overflow-hidden p-5 hover:-translate-y-1 hover:border-[var(--team-primary-soft)]"
            href={`/equipos/${slug}/logros/${achievement.id}`}
            key={achievement.id}
          >
            <Image src={achievementOverlay} alt="" fill sizes="(min-width: 768px) 33vw, 100vw" className="pointer-events-none object-cover" />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl" aria-hidden="true">{achievement.icono || "✦"}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--team-muted)]">LG-{achievement.id}</span>
              </div>
              <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--team-primary-soft)]">{achievement.categoria || "Logro"}</p>
              <h3 className="team-display mt-2 text-xl font-extrabold leading-tight">{achievement.nombre}</h3>
            </div>
            <p className="relative z-10 mt-6 border-t border-[var(--team-line)] pt-3 text-xs font-bold uppercase tracking-[0.08em] text-[var(--team-orange)]">{achievement.puntos} puntos</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
