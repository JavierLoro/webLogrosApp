import Link from "next/link"
import type { ReactNode } from "react"

type Breadcrumb = {
  label: string
  href?: string
}

type PageHeaderProps = {
  title: ReactNode
  description?: ReactNode
  eyebrow?: string
  actions?: ReactNode
  breadcrumbs?: Breadcrumb[]
  className?: string
}

export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, className = "" }: PageHeaderProps) {
  return (
    <header className={`flex flex-col justify-between gap-4 border-b border-[var(--team-line)] pb-5 sm:flex-row sm:items-end ${className}`.trim()}>
      <div className="min-w-0">
        {breadcrumbs?.length ? (
          <nav aria-label="Migas de pan" className="mb-3">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--team-muted)]">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                  {index > 0 ? <span aria-hidden="true">/</span> : null}
                  {item.href ? <Link href={item.href} className="hover:text-[var(--team-text)]">{item.label}</Link> : <span aria-current="page">{item.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        {eyebrow ? <p className="font-mono text-[length:var(--lb-text-meta)] font-semibold uppercase tracking-[0.12em] text-[var(--team-muted)]">{eyebrow}</p> : null}
        <h1 className="team-display mt-1 text-[length:var(--lb-text-page-title)] font-black leading-[var(--lb-leading-page-title)] tracking-[-0.035em] text-[var(--team-text)]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-[65ch] text-[length:var(--lb-text-body)] leading-[var(--lb-leading-body)] text-[var(--team-muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
