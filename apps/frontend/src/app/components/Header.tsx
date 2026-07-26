// 📚 Client Component: la cabecera cambia según haya sesión, y eso solo se sabe leyendo
//    localStorage (existe únicamente en el navegador).
"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

export default function Header() {
  const router = useRouter()
  // 📚 usePathname: ruta actual. La usamos como dependencia del useEffect de abajo.
  const pathname = usePathname()
  const [logueado, setLogueado] = useState(false)

  // 📚 useEffect con [pathname] como dependencia: se re-ejecuta cada vez que cambia la ruta.
  //    Así, tras login/logout (que navegan), la cabecera vuelve a mirar el token y se
  //    actualiza sola. !!valor convierte a booleano (hay token → true).
  useEffect(() => {
    setLogueado(!!localStorage.getItem("token"))
  }, [pathname])

  // 📚 Logout = borrar el token del navegador y volver a login. No hay estado en el servidor
  //    que limpiar: la "sesión" vive en el JWT guardado en el cliente.
  function handleLogout() {
    localStorage.removeItem("token")
    router.push("/login")
  }

  return (
    <header className="border-b px-8 py-4 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">
        Logros del equipo
      </Link>

      <div className="flex items-center gap-4">
        {logueado ? (
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        ) : (
          <>
            <Link href="/login" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
