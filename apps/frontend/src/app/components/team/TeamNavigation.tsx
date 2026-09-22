"use client"

import Link from "next/link"
import Image from "next/image"
import compactLogo from "../../../../LockerBoard-marca/otros/brand/logo/lockerboard-logo-compact-color-on-dark.svg"
import horizontalLogo from "../../../../LockerBoard-marca/otros/brand/logo/lockerboard-logo-horizontal-color-on-dark.svg"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { TeamIdentity } from "./TeamIdentity"
import MaterialIcon, { type MaterialIconName } from "@/app/components/ui/icons/MaterialIcon"
import type { TeamRole } from "@/types/api"
import { logoutAuthSession } from "@/lib/authSession"

type NavigationItem = {
  label: string
  href: string
  icon: MaterialIconName
  active: (pathname: string) => boolean
}

type TeamNavigationProps = {
  slug: string
  teamName: string
  role?: TeamRole
  loading?: boolean
}

export function TeamNavigation({ slug, teamName, role, loading = false }: TeamNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const basePath = `/equipos/${slug}`
  const navigationId = `team-navigation-${slug}`
  const isAdminActive = pathname === `${basePath}/admin` || pathname.startsWith(`${basePath}/admin/`)

  const items: NavigationItem[] = [
    { label: "Dashboard", href: basePath, icon: "dashboard", active: (path) => path === basePath },
    { label: "Logros", href: `${basePath}/logros`, icon: "emoji_events", active: (path) => path.startsWith(`${basePath}/logros`) },
    { label: "Ranking", href: `${basePath}/ranking`, icon: "leaderboard", active: (path) => path.startsWith(`${basePath}/ranking`) },
    { label: "Jugadores", href: `${basePath}/jugadores`, icon: "groups", active: (path) => path.startsWith(`${basePath}/jugadores`) },
    { label: "Solicitudes", href: `${basePath}/solicitudes`, icon: "assignment", active: (path) => path.startsWith(`${basePath}/solicitudes`) },
  ]

  const itemClass = (active: boolean) => [
    "flex min-h-11 items-center gap-3 rounded-[var(--lb-radius-control)] px-3 py-2 font-[var(--lb-font-display)] text-sm font-bold leading-none tracking-[-0.015em]",
    "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)]",
    active
      ? "bg-[var(--team-primary)] text-white"
      : "text-[var(--team-muted)] hover:bg-[var(--team-surface-low)] hover:text-[var(--team-text)]",
  ].join(" ")

  async function handleLogout() {
    try {
      await logoutAuthSession()
      router.push("/login")
    } catch {
      // Permanecemos en la pantalla si el servidor no confirmó el cierre.
    }
  }

  return (
    <aside className="sticky top-0 z-30 border-b border-[var(--team-line)] bg-[var(--lb-color-bg-shell)] md:fixed md:inset-y-0 md:left-0 md:flex md:w-[var(--lb-sidebar-width)] md:flex-col md:border-r md:border-b-0">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 md:min-h-32 md:justify-center md:border-b md:border-[var(--team-line)] md:px-3">
        <Link
          href={basePath}
          className="flex min-w-0 items-center gap-3 rounded-[var(--lb-radius-control)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lb-color-focus)] md:w-full md:flex-col md:justify-center md:gap-2 md:text-center"
          aria-label={`${teamName}, dashboard`}
        >
          <span className="min-w-0 md:hidden">
            <Image src={horizontalLogo} alt="LockerBoard" width={180} height={48} className="h-auto w-[180px]" />
            <span className="mt-1 block truncate text-xs text-[var(--team-muted)]">{teamName}</span>
          </span>
          <Image src={compactLogo} alt="LockerBoard" width={136} height={100} className="hidden h-auto w-[136px] max-w-full md:block" />
        </Link>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-[var(--lb-radius-control)] border border-[var(--team-line)] text-[var(--team-text)] hover:bg-[var(--team-surface-low)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] md:hidden"
          aria-expanded={isOpen}
          aria-controls={navigationId}
          aria-label={isOpen ? "Cerrar navegación del equipo" : "Abrir navegación del equipo"}
          onClick={() => setIsOpen((current) => !current)}
        >
          <MaterialIcon name={isOpen ? "close" : "menu"} className="size-6" />
        </button>
      </div>

      <div id={navigationId} className={`${isOpen ? "flex" : "hidden"} max-h-[calc(100dvh-4rem)] flex-col overflow-y-auto md:flex md:max-h-none md:min-h-0 md:flex-1`}>
        <nav aria-label={`Navegación de ${teamName}`} className="grid gap-1 px-3 py-3 md:py-5">
          {items.map((item) => {
            const active = item.active(pathname)
            return (
              <Link key={item.href} href={item.href} className={itemClass(active)} aria-current={active ? "page" : undefined} onClick={() => setIsOpen(false)}>
                <MaterialIcon name={item.icon} className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {role === "TEAM_ADMIN" ? (
          <nav aria-label={`Administración de ${teamName}`} className="grid gap-1 border-t border-[var(--team-line)] px-3 py-3">
            <Link
              href={`${basePath}/admin`}
              className={itemClass(isAdminActive)}
              aria-current={isAdminActive ? "page" : undefined}
              onClick={() => setIsOpen(false)}
            >
              <MaterialIcon name="settings" className="size-5 shrink-0" />
              <span>Administración</span>
            </Link>
          </nav>
        ) : null}

        <div className="mt-auto grid gap-3 border-t border-[var(--team-line)] px-3 py-3 md:py-4">
          <TeamIdentity teamName={teamName} slug={slug} loading={loading} compact />
          <Link href="/equipos" className={itemClass(false)} onClick={() => setIsOpen(false)}>
            <MaterialIcon name="swap_horiz" className="size-5 shrink-0" />
            <span>Cambiar equipo</span>
          </Link>
          <button type="button" onClick={handleLogout} className={`${itemClass(false)} w-full text-left`}>
            <MaterialIcon name="logout" className="size-5 shrink-0" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
