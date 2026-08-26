import Link from "next/link";
import { Badge } from "../ui/Badge";
import { buttonClassName } from "../ui/Button";

export type SiteHeaderProps = {
  seasonLabel?: string;
};

export function SiteHeader({ seasonLabel = "Temporada 01" }: SiteHeaderProps) {
  return (
    <header className="border-b border-line bg-paper-bright/90 backdrop-blur-md">
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="WebLogros, inicio">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-[0.65rem] border-2 border-ink bg-season-gold font-mono text-lg font-bold text-ink shadow-[3px_3px_0_var(--ink)] transition-transform duration-150 group-hover:-translate-y-0.5"
            aria-hidden="true"
          >
            W
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-[-0.03em] text-ink sm:text-base">WebLogros</span>
            <span className="block font-mono text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-ink-faint">Club record</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          <Link className="rounded-control px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink" href="/">
            Inicio
          </Link>
          <Link className="rounded-control px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink" href="/comunidad">
            Comunidad
          </Link>
          <Link className="rounded-control px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-deep hover:text-ink" href="/solicitar-acceso">
            Para equipos
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Badge tone="gold">{seasonLabel}</Badge>
          <Link className={buttonClassName("primary", "sm")} href="/login">
            Entrar
          </Link>
        </div>

        <div className="md:hidden">
          <Badge tone="gold">{seasonLabel}</Badge>
        </div>
      </div>
      <div className="mx-auto hidden max-w-7xl items-center gap-3 px-4 pb-2 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-ink-faint sm:px-6 md:flex lg:px-8">
        <span className="h-px w-8 bg-club-red" aria-hidden="true" />
        <span>Registro de logros, orgullo de equipo</span>
      </div>
    </header>
  );
}
