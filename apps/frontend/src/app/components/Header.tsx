// 📚 Client Component: la cabecera cambia según haya sesión, y eso solo se sabe leyendo
//    localStorage (existe únicamente en el navegador).
"use client"

import { useSyncExternalStore } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import lockerboardLogo from "../../../LockerBoard-marca/brand/logo/lockerboard-logo-horizontal-color-on-dark.svg"
import lockerboardSymbol from "../../../LockerBoard-marca/brand/symbol/lockerboard-symbol-color-on-dark.svg"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const isHome = pathname === "/"
  // All public surfaces now share the carbon navigation; tenant routes still
  // return null below and render their own contextual rail.
  const interior = true
  const logueado = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange)
      window.addEventListener("auth-change", onChange)
      return () => {
        window.removeEventListener("storage", onChange)
        window.removeEventListener("auth-change", onChange)
      }
    },
    () => Boolean(localStorage.getItem("token")),
    () => false,
  )
  const isSuperAdmin = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("storage", onChange)
      window.addEventListener("auth-change", onChange)
      return () => {
        window.removeEventListener("storage", onChange)
        window.removeEventListener("auth-change", onChange)
      }
    },
    () => localStorage.getItem("isSuperAdmin") === "true",
    () => false,
  )

  // El shell de un equipo tiene su propia navegación contextual. La ruta
  // /equipos sigue mostrando este header para que la lista de equipos conserve
  // la navegación global.
  if (pathname.startsWith("/equipos/") && pathname !== "/equipos") {
    return null
  }

  // 📚 Logout = borrar el token del navegador y volver a login. No hay estado en el servidor
  //    que limpiar: la "sesión" vive en el JWT guardado en el cliente.
  function handleLogout() {
    localStorage.removeItem("token")
    localStorage.removeItem("teams")
    localStorage.removeItem("isSuperAdmin")
    window.dispatchEvent(new Event("auth-change"))
    router.push("/login")
  }

  return (
    <header className={isHome ? "home-floating-header" : interior ? "interior-header px-3 py-4 sm:px-8" : "border-b border-ink/15 bg-paper px-3 py-4 text-ink sm:px-8"}>
      <div className={isHome ? "home-floating-inner" : "mx-auto flex max-w-7xl items-center justify-between"}>
      <Link href="/" aria-label="LockerBoard" className={interior ? "interior-brand focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5545]" : "font-bold text-lg tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-coral"}>
        <Image src={lockerboardSymbol} alt="" className="size-9 sm:hidden" priority />
        <Image src={lockerboardLogo} alt="" className="hidden h-auto w-[180px] sm:block" priority />
      </Link>

      {isHome && (
        <nav className="home-nav-links" aria-label="Navegación principal">
          <a href="#inicio" aria-current="page">Inicio</a>
          <a href="#producto">Producto</a>
          <a href="#como-funciona">Cómo funciona</a>
        </nav>
      )}

      <div className="flex items-center gap-1 sm:gap-4">
        {logueado ? (
          <><Link href="/equipos" className={interior ? "interior-link min-h-11 rounded-md px-2 py-2 text-xs sm:px-3 sm:text-sm" : "min-h-11 rounded-md px-2 py-2 text-xs text-ink/70 hover:text-coral sm:px-3 sm:text-sm"}>Mis equipos</Link>{isSuperAdmin && <Link href="/admin" className={interior ? "interior-link min-h-11 rounded-md px-2 py-2 text-xs sm:px-3 sm:text-sm" : "min-h-11 rounded-md px-2 py-2 text-xs text-ink/70 hover:text-coral sm:px-3 sm:text-sm"}>Admin</Link>}<Link href="/unirse" className={interior ? "interior-link hidden min-h-11 rounded-md px-3 py-2 text-sm sm:inline-flex" : "hidden min-h-11 rounded-md px-3 py-2 text-sm text-ink/70 hover:text-coral sm:inline-flex"}>Unirse</Link><button onClick={handleLogout} className={interior ? "interior-link min-h-11 rounded-md px-2 text-xs sm:px-3 sm:text-sm" : "min-h-11 rounded-md px-2 text-xs text-ink/70 transition-colors hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral sm:px-3 sm:text-sm"}>Cerrar sesión</button></>
        ) : (
          <>
            <Link href="/login" className={interior ? "interior-link min-h-11 rounded-md px-3 py-2 text-sm" : "min-h-11 rounded-md px-3 text-sm text-ink/70 transition-colors hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"}>
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className={interior ? "interior-cta min-h-11 rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff5545]" : "min-h-11 rounded-md bg-coral px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-coral/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"}
            >
              Crear cuenta
            </Link>
          </>
        )}
      </div>
      </div>
    </header>
  )
}
