"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "../ui/Icon";

type NavItem = {
  label: string;
  href: string;
  icon: Exclude<IconName, "more" | "arrow" | "check" | "alert" | "spinner">;
};

export type MobileNavProps = {
  items?: NavItem[];
};

function isCurrentPath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({ items }: MobileNavProps) {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const teamSlug = pathname.match(/^\/equipos\/([^/]+)/)?.[1];
  const teamBase = teamSlug ? `/equipos/${teamSlug}` : "";
  const navItems: NavItem[] = items ?? [
    { label: "Inicio", href: teamBase || "/", icon: "home" },
    { label: "Logros", href: teamBase ? `${teamBase}/logros` : "/logros", icon: "trophy" },
    { label: "Ranking", href: teamBase ? `${teamBase}/ranking` : "/login", icon: "community" },
  ];
  const moreLinks = teamBase
    ? [
        { label: "Jugadores", href: `${teamBase}/jugadores` },
        { label: "Mis solicitudes", href: `${teamBase}/solicitudes` },
        { label: "Comunidad", href: "/comunidad" },
        { label: "Administración", href: `${teamBase}/admin` },
      ]
    : [
        { label: "Solicitar acceso", href: "/solicitar-acceso" },
        { label: "Iniciar sesión", href: "/login" },
        { label: "Crear cuenta", href: "/register" },
      ];

  useEffect(() => {
    if (!isMoreOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMoreOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMoreOpen]);

  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-paper-bright/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(32,39,42,0.08)] backdrop-blur-md md:hidden"
      data-component="MOB-NAV-02"
    >
      <div className="mx-auto grid min-h-21 max-w-lg grid-cols-4 px-2">
        {navItems.slice(0, 3).map((item) => {
          const current = isCurrentPath(pathname, item.href);
          return (
            <Link
              key={item.href}
              aria-current={current ? "page" : undefined}
              className={[
                "flex min-h-17 flex-col items-center justify-center gap-1 rounded-control px-1 text-[0.62rem] font-semibold transition-colors",
                current ? "text-club-red" : "text-ink-faint hover:bg-paper-deep hover:text-ink",
              ].join(" ")}
              href={item.href}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="relative flex items-center justify-center">
          {isMoreOpen ? (
            <div
              className="absolute bottom-[calc(100%+0.65rem)] right-1 w-52 rounded-card border border-line bg-paper-bright p-2 shadow-paper"
              role="menu"
              aria-label="Más opciones"
            >
              <p className="px-3 pb-2 pt-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-ink-faint">Más opciones</p>
              {moreLinks.map((link) => (
                <Link
                  key={link.href}
                  className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-ink-soft hover:bg-paper-deep hover:text-ink"
                  href={link.href}
                  onClick={() => setIsMoreOpen(false)}
                  role="menuitem"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            aria-expanded={isMoreOpen}
            aria-haspopup="menu"
            aria-label={isMoreOpen ? "Cerrar más opciones" : "Abrir más opciones"}
            className={[
              "flex min-h-17 min-w-16 flex-col items-center justify-center gap-1 rounded-control px-1 text-[0.62rem] font-semibold transition-colors",
              isMoreOpen ? "text-club-red" : "text-ink-faint hover:bg-paper-deep hover:text-ink",
            ].join(" ")}
            onClick={() => setIsMoreOpen((open) => !open)}
          >
            <Icon name="more" size={19} />
            <span>Más</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
