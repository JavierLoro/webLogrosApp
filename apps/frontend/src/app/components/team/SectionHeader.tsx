import type { ReactNode } from "react"

type SectionHeaderProps = {
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  level?: 2 | 3
  className?: string
}

export function SectionHeader({ title, description, icon, action, level = 2, className = "" }: SectionHeaderProps) {
  const Heading = level === 2 ? "h2" : "h3"

  return (
    <header className={`flex items-start justify-between gap-4 border-b border-[var(--team-line)] pb-3 ${className}`.trim()}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon ? <span className="mt-0.5 shrink-0 text-[var(--team-primary)]" aria-hidden="true">{icon}</span> : null}
        <div className="min-w-0">
          <Heading className="team-display text-[var(--lb-text-section-title)] font-extrabold leading-[var(--lb-leading-section-title)] text-[var(--team-text)]">
            {title}
          </Heading>
          {description ? <p className="mt-1 text-sm leading-5 text-[var(--team-muted)]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0 text-sm font-semibold text-[var(--team-primary)]">{action}</div> : null}
    </header>
  )
}
