import type { AchievementProgress } from "@/types/api"

const labels = { NOT_STARTED: "Sin empezar", IN_PROGRESS: "En progreso", ELIGIBLE: "Objetivo alcanzado · pendiente de concesión", AWARDED: "Conseguido" }

export function AchievementProgressDisplay({ progress, available = true }: { progress: AchievementProgress | null; available?: boolean }) {
  if (!available) return <p className="mb-3 text-xs leading-5 text-[var(--team-muted)]">Progreso no disponible: no hay una temporada activa.</p>
  if (!progress) return null
  return <div className="mb-3 space-y-1.5 text-xs text-[var(--team-muted)]">
    <p>{labels[progress.status]}</p>
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1 font-[var(--lb-font-data)] tabular-nums text-[var(--team-text)]">
      <span className="min-w-0 [overflow-wrap:anywhere]">{progress.currentValue}</span>
      <span>/</span>
      <span className="min-w-0 [overflow-wrap:anywhere]">{progress.targetValue}</span>
    </p>
    <progress aria-label="Progreso del logro" value={Math.min(progress.currentValue, progress.targetValue)} max={progress.targetValue} className="block h-2 w-full accent-[var(--team-primary)]" />
  </div>
}
