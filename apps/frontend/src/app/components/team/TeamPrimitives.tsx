import type { HTMLAttributes, ReactNode } from "react"

export function TeamSurface({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={`rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] p-[var(--lb-panel-padding)] shadow-[var(--lb-inset-highlight)] ${className}`.trim()}
      {...props}
    />
  )
}

export function KpiStrip({ className = "", ...props }: HTMLAttributes<HTMLDListElement>) {
  return (
    <dl
      className={`grid overflow-hidden rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] sm:grid-flow-col sm:auto-cols-fr ${className}`.trim()}
      {...props}
    />
  )
}

export function KpiItem({ label, value, icon, detail, className = "" }: { label: ReactNode; value: ReactNode; icon?: ReactNode; detail?: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-20 items-center gap-3 border-b border-[var(--team-line)] px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0 ${className}`.trim()}>
      {icon ? <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lb-radius-control)] border border-[var(--team-line)] bg-[var(--team-surface-low)] text-[var(--team-text)]" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0">
        <dt className="text-xs leading-4 text-[var(--team-muted)]">{label}</dt>
        <dd className="mt-1 font-[var(--lb-font-data)] text-[var(--lb-text-kpi)] font-semibold leading-[var(--lb-leading-kpi)] tabular-nums text-[var(--team-text)]">{value}</dd>
        {detail ? <dd className="mt-1 text-xs text-[var(--lb-color-text-tertiary)]">{detail}</dd> : null}
      </div>
    </div>
  )
}

export function TeamToolbar({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex min-h-[var(--lb-control-height)] flex-col gap-2 rounded-[var(--lb-radius-panel)] border border-[var(--team-line)] bg-[var(--team-surface)] p-2 sm:flex-row sm:items-center ${className}`.trim()}
      {...props}
    />
  )
}

const statusStyles = {
  neutral: "border-[var(--team-line)] bg-[var(--team-surface-strong)] text-[var(--team-muted)]",
  success: "border-[color:color-mix(in_srgb,var(--lb-color-success)_35%,transparent)] bg-[var(--lb-color-success-surface)] text-[var(--lb-color-success)]",
  warning: "border-[color:color-mix(in_srgb,var(--lb-color-warning)_35%,transparent)] bg-[var(--lb-color-warning-surface)] text-[var(--lb-color-warning)]",
  danger: "border-[color:color-mix(in_srgb,var(--lb-color-danger)_35%,transparent)] bg-[var(--lb-color-danger-surface)] text-[var(--lb-color-danger)]",
  review: "border-[color:color-mix(in_srgb,var(--lb-color-review)_35%,transparent)] bg-[var(--lb-color-review-surface)] text-[var(--lb-color-review)]",
} as const

const statusMarks = { neutral: "•", success: "✓", warning: "!", danger: "×", review: "…" } as const

export function TeamStatus({ tone = "neutral", children, className = "", ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof statusStyles }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center gap-1.5 rounded-[var(--lb-radius-status)] border px-2 py-1 text-xs font-semibold ${statusStyles[tone]} ${className}`.trim()}
      {...props}
    >
      <span aria-hidden="true">{statusMarks[tone]}</span>
      {children}
    </span>
  )
}
