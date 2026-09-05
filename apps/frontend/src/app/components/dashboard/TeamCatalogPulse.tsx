export function TeamCatalogPulse({ total }: { total: number }) {
  const visiblePips = Math.min(Math.max(total, 1), 20)

  return (
    <section className="team-surface relative flex min-h-80 flex-col justify-between overflow-hidden p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-y-0 right-[-8%] w-1/2 -skew-x-12 bg-gradient-to-br from-transparent via-[rgba(255,85,69,.14)] to-transparent" />
      <div className="relative z-10">
        <p className="team-eyebrow">Catálogo del equipo</p>
        <strong className="team-display mt-2 block text-7xl font-black leading-none tracking-[-0.06em] sm:text-8xl">{total}</strong>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.12em] text-[var(--team-muted)]">logros en el catálogo</p>
      </div>

      <div className="relative z-10 mt-12">
        <div aria-hidden="true" className="flex max-w-lg gap-1">
          {Array.from({ length: 20 }, (_, index) => (
            <span
              className={`h-6 min-w-1 flex-1 -skew-x-12 ${index < visiblePips ? "bg-[var(--team-primary)] shadow-[0_0_10px_rgba(255,85,69,.45)]" : "bg-[var(--team-surface-high)]"}`}
              key={index}
            />
          ))}
        </div>
        <p className="mt-4 max-w-md text-sm leading-6 text-[var(--team-muted)]">Cada pieza del catálogo nombra un avance que este equipo considera digno de celebrarse.</p>
      </div>
    </section>
  )
}
