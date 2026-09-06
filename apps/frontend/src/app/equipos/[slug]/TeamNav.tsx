"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { apiFetch } from "@/lib/api"

export function TeamNav({ slug, teamName }: { slug: string; teamName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const basePath = `/equipos/${slug}`
  const home = pathname === basePath
  const logros = pathname === `${basePath}/logros` || pathname.startsWith(`${basePath}/logros/`)
  const solicitudes = pathname === `${basePath}/solicitudes`

  const itemClass = (active: boolean) => [
    "flex min-h-11 items-center gap-3 px-4 py-3 text-sm font-semibold tracking-wide",
    "border-l-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
    active
      ? "border-[var(--team-primary)] bg-[var(--team-primary)] text-[var(--team-on-primary)]"
      : "border-transparent text-[var(--team-muted)] hover:border-[var(--team-outline-strong)] hover:bg-[var(--team-surface-low)] hover:text-[var(--team-text)]",
  ].join(" ")

  const soonClass = "flex min-h-11 items-center gap-3 border-l-2 border-transparent px-4 py-3 text-sm text-[var(--team-muted)] opacity-60"

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" })
    window.dispatchEvent(new Event("auth-change"))
    router.push("/login")
  }

  return <nav aria-label={`Navegación de ${teamName}`} className="border-b border-[var(--team-line)] bg-[var(--team-surface)] md:fixed md:inset-y-0 md:left-0 md:z-20 md:flex md:w-64 md:flex-col md:border-b-0 md:border-r">
    <div className="flex min-h-16 items-center justify-between border-b border-[var(--team-line)] px-5 py-4 md:block md:min-h-0 md:px-6 md:py-6">
      <Link href={basePath} className="group flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--team-primary)]">
        <span className="grid size-10 shrink-0 -skew-x-6 place-items-center bg-[var(--team-primary)] font-display text-xl font-black text-[var(--team-on-primary)]" aria-hidden="true">✦</span>
        <span className="min-w-0">
          <span className="block truncate font-display text-lg font-bold uppercase leading-none tracking-tight text-[var(--team-text)] group-hover:text-[var(--team-primary)]">{teamName}</span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.2em] text-[var(--team-muted)]">Sala del equipo</span>
        </span>
      </Link>
      <span className="hidden font-mono text-[9px] uppercase tracking-[.25em] text-[var(--team-muted)] md:mt-10 md:block">Navegación</span>
    </div>
    <div className="flex gap-1 overflow-x-auto px-3 py-3 md:block md:overflow-visible md:px-3 md:py-4">
      <Link href={basePath} className={itemClass(home)} aria-current={home ? "page" : undefined}>
        <span aria-hidden="true" className="font-mono text-xs text-[var(--team-primary)]">01</span><span>Inicio</span>
      </Link>
      <Link href={`${basePath}/logros`} className={itemClass(logros)} aria-current={logros ? "page" : undefined}>
        <span aria-hidden="true" className="font-mono text-xs text-[var(--team-primary)]">02</span><span>Logros</span>
      </Link>
      <Link href={`${basePath}/solicitudes`} className={itemClass(solicitudes)} aria-current={solicitudes ? "page" : undefined}>
        <span aria-hidden="true" className="font-mono text-xs text-[var(--team-primary)]">03</span><span>Solicitudes</span>
      </Link>
      <span className={soonClass} aria-disabled="true"><span aria-hidden="true" className="font-mono text-xs">04</span><span>Ranking</span><span className="ml-auto font-mono text-[9px] uppercase tracking-wider">Pronto</span></span>
      <span className={soonClass} aria-disabled="true"><span aria-hidden="true" className="font-mono text-xs">05</span><span>Jugadores</span><span className="ml-auto font-mono text-[9px] uppercase tracking-wider">Pronto</span></span>
      <span className={soonClass} aria-disabled="true"><span aria-hidden="true" className="font-mono text-xs">06</span><span>Comunidad</span><span className="ml-auto font-mono text-[9px] uppercase tracking-wider">Pronto</span></span>
    </div>
    <div className="flex gap-1 overflow-x-auto border-t border-[var(--team-line)] px-3 py-3 md:mt-auto md:block md:overflow-visible">
      <Link href="/equipos" className={itemClass(false)}>Cambiar equipo</Link>
      <Link href={`${basePath}/admin`} className={itemClass(pathname === `${basePath}/admin`)} aria-current={pathname === `${basePath}/admin` ? "page" : undefined}>Crear invitación</Link>
      <button type="button" onClick={handleLogout} className={`${itemClass(false)} w-full text-left`}>Cerrar sesión</button>
    </div>
  </nav>
}
