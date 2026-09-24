"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuthSession } from "@/hooks/useAuthSession"
import { logoutAuthSession } from "@/lib/authSession"
import lockerboardLogo from "../../../../LockerBoard-marca/otros/brand/logo/lockerboard-logo-horizontal-color-on-dark.svg"
import lockerboardSymbol from "../../../../LockerBoard-marca/otros/brand/symbol/lockerboard-symbol-color-on-dark.svg"

export function OnboardingHeader() {
  return (
    <header className="border-b border-[var(--lb-color-border)] bg-[var(--lb-color-bg-shell)] text-[var(--lb-color-text-primary)]">
      <div className="mx-auto flex min-h-16 w-full max-w-[78rem] items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="LockerBoard — inicio" className="shrink-0 rounded-[var(--lb-radius-control)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lb-color-focus)]">
          <Image src={lockerboardSymbol} alt="" priority className="size-9 sm:hidden" />
          <Image src={lockerboardLogo} alt="" priority className="hidden h-auto w-[10.5rem] sm:block" />
        </Link>

        <OnboardingSessionActions includeJoin />
      </div>
    </header>
  )
}

export function OnboardingSessionActions({ includeJoin = false }: { includeJoin?: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const { session } = useAuthSession()
  const loggedIn = session !== null
  const isSuperAdmin = session?.isSuperAdmin ?? false

  async function logout() {
    try {
      await logoutAuthSession()
      router.push("/login")
    } catch {
      // Permanecemos en la pantalla si el servidor no confirmó el cierre.
    }
  }

  return (
    <nav aria-label="Acciones de la cuenta" className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
      {loggedIn ? (
        <>
          <HeaderLink href="/perfil" current={pathname === "/perfil"}>Mi perfil</HeaderLink>
          {isSuperAdmin ? <HeaderLink href="/admin" current={pathname === "/admin"}>Admin</HeaderLink> : null}
          {!includeJoin ? <HeaderLink href="/equipos" current={pathname === "/equipos"}>Mis equipos</HeaderLink> : null}
          {includeJoin ? <HeaderLink href="/unirse" current={pathname === "/unirse"}>Unirse</HeaderLink> : null}
          <button
            type="button"
            onClick={logout}
            className="inline-flex min-h-11 items-center rounded-[var(--lb-radius-control)] px-2.5 text-xs font-semibold text-[var(--lb-color-text-secondary)] hover:bg-[var(--lb-color-surface-raised)] hover:text-[var(--lb-color-text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] sm:px-3 sm:text-sm"
          >
            Cerrar sesión
          </button>
        </>
      ) : (
        <HeaderLink href="/login" current={false}>Iniciar sesión</HeaderLink>
      )}
    </nav>
  )
}

function HeaderLink({ href, current, children }: { href: string; current: boolean; children: string }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={`inline-flex min-h-11 items-center rounded-[var(--lb-radius-control)] px-2.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lb-color-focus)] sm:px-3 sm:text-sm ${current ? "bg-[var(--lb-color-surface-raised)] text-[var(--lb-color-text-primary)]" : "text-[var(--lb-color-text-secondary)] hover:bg-[var(--lb-color-surface-raised)] hover:text-[var(--lb-color-text-primary)]"}`}
    >
      {children}
    </Link>
  )
}
