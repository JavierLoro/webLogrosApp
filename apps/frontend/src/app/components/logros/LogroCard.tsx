import Link from "next/link"
import { AchievementMedia } from "@/app/components/team/AchievementMedia"
import MaterialIcon from "@/app/components/ui/icons/MaterialIcon"
import type { CatalogAchievement } from "@/types/api"
import { AchievementProgressDisplay } from "./AchievementProgressDisplay"

export function LogroCard({ logro, slug }: { logro: CatalogAchievement; slug: string }) {
  if (logro.isHidden) return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)]">
      <div className="grid aspect-video place-items-center border-b border-[var(--team-line)] bg-[var(--team-surface-low)] text-4xl text-[var(--team-muted)]" aria-hidden="true">?</div>
      <div className="p-3"><h2 className="team-display text-[var(--lb-text-card-title)] font-extrabold text-[var(--team-text)]">Logro secreto</h2><p className="mt-2 text-xs leading-5 text-[var(--team-muted)]">Sus detalles se revelarán cuando alguien del equipo lo consiga.</p></div>
    </article>
  )
  const category = logro.categoria?.trim() || "Sin categoría"

  return (
    <Link
      href={`/equipos/${slug}/logros/${logro.id}`}
      className="group block min-w-0 rounded-[var(--lb-radius-panel)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]"
      aria-label={`Ver logro ${logro.nombre}`}
    >
      <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] shadow-[var(--lb-inset-highlight)] transition-colors group-hover:border-[var(--team-outline-strong)]">
        <div className="relative overflow-hidden border-b border-[var(--team-line)]">
          <AchievementMedia name={logro.nombre} variant="landscape" className="rounded-none" />
          {logro.earnedByMe ? (
            <span className="absolute left-2 top-2 inline-flex min-h-7 items-center gap-1 rounded-[var(--lb-radius-status)] border border-[color:color-mix(in_srgb,var(--lb-color-success)_40%,transparent)] bg-[var(--lb-color-success-surface)] px-2 py-1 text-[0.6875rem] font-semibold text-[var(--lb-color-success)]">
              <MaterialIcon name="check" className="size-3.5" />
              Conseguido
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <h2 className="team-display line-clamp-2 text-[var(--lb-text-card-title)] font-extrabold leading-[var(--lb-leading-card-title)] text-[var(--team-text)]" title={logro.nombre}>
            {logro.nombre}
          </h2>
          <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-[var(--team-muted)]" title={logro.descripcion ?? undefined}>
            {logro.descripcion || "Sin descripción"}
          </p>

          <div className="mt-auto min-w-0 border-t border-[var(--team-line)] pt-2.5">
            {logro.isSecret ? <p className="mb-2 text-xs text-[var(--team-muted)]">Secreto · {logro.isRevealed ? "Revelado" : "Visible para administración"}</p> : null}
            {logro.kind === "PROGRESSIVE" ? <AchievementProgressDisplay progress={logro.progress} available={logro.progressAvailable} /> : null}
            <p className="truncate text-[0.625rem] font-semibold uppercase leading-4 tracking-[0.06em] text-[var(--team-muted)]" title={category}>
              {category}
            </p>
            <div className="mt-1.5 flex min-w-0 items-end justify-between gap-2">
              <span className="font-[var(--lb-font-data)] text-base font-semibold tabular-nums text-[var(--team-text)]">
                {logro.puntos} <span className="text-[0.6875rem] font-normal text-[var(--team-muted)]">pts</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1 text-[0.6875rem] text-[var(--team-muted)]" title={`${logro.holdersCount} ${logro.holdersCount === 1 ? "miembro" : "miembros"}`}>
                <MaterialIcon name="groups" className="size-3.5 shrink-0" />
                <span className="truncate font-[var(--lb-font-data)] tabular-nums">{logro.holdersCount}</span>
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
