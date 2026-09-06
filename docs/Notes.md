# Notes

Use this file as a technical logbook:
- errors encountered
- fixes
- decisions made
- TODOs

## TODO
- Extender DB schema: teams, stats, relación User↔Logro (ver Roadmap Phase 6)
- Endpoints de admin con roles (ver Roadmap Phase 7)


## Decisions made

- Un solo repo, mas comodo para progresar en el aprendizaje
- Next.js router: **App Router**
- JWT transport: **cookie HttpOnly** con `SameSite=Lax` (`Secure` en producción); el frontend no accede al token
- App = **plataforma multi-tenant** de logros (ver Architecture.md) — decidido 2026-06-10
- URLs de tenant: **ruta por slug** (`/equipos/[slug]`), no subdominios — el Universal SSL gratis de Cloudflare no cubre sub-subdominios (`*.logros.jlc-dev.me` requeriría ACM ~10$/mes); migrable a subdominios más adelante sin cambiar el modelo de datos

## Backlog de producto

Ideas para más adelante (los equipos ya son núcleo de la app, ver Roadmap Phase 6):

- **Rachas y niveles** — logros con tiers bronce/plata/oro; gamificación real del sistema de puntos
- **Historial/actividad** — feed "X ganó el logro Y hace 2h"; se convierte en el feed en vivo de Phase 12 (WebSockets)
- **Widgets de stats personalizables** — el TEAM_ADMIN elige qué stats muestra el dashboard de su equipo
