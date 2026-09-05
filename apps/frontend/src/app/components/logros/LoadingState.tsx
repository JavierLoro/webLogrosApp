export function LoadingState() {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Cargando logros" role="status">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-[1.25rem] border border-[var(--team-line)] bg-[var(--team-surface-low)]" />)}<span className="sr-only">Cargando catálogo de logros…</span></div>
}
