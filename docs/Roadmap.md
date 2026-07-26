# Roadmap

## Ruta de aprendizaje
JS → TS → Express → PostgreSQL → Docker → Prisma → Next.js → JWT → Nginx → CI/CD → Proxmox → Hardening → Multi-tenancy (Relaciones DB) → Roles → Auth Hardening → Solicitudes/Admin → Aggregaciones SQL → Comunidad → shadcn/ui → File uploads → Testing → **WebSockets**

> **Concepto de la app:** plataforma multi-tenant de logros — ver mapa de rutas y roles en [Architecture.md](Architecture.md)

---

## Phase 1 – Project Base
- [x] Create GitHub repository
- [x] Next.js + TypeScript initialized
- [x] Express + TypeScript initialized
- [x] Basic health endpoints and local run scripts

## Phase 2 – Public Website
- [x] Public homepage
- [x] Achievements list page (`/logros`, `/logros/[id]`)
- [x] Backend public endpoints (GET /logros, GET /logros/:id)

## Phase 3 – Auth & Admin
- [x] Register + Login pages (Client Components)
- [x] Auth (JWT) — backend: register, login, authMiddleware
- [x] Protected create-logro form (token from localStorage)
- [x] Session-aware header (usePathname + useEffect)
- [x] Backend protected endpoints (POST /logros)

## Phase 4 – Database
- [x] PostgreSQL container (Docker)
- [x] Prisma schema + migrations
- [ ] Seed data

## Phase 5 – Deployment
- [x] Dockerfiles (frontend + backend)
- [x] Docker Compose (db + backend + frontend + nginx)
- [x] Nginx reverse proxy (puerto 80, /api/* → backend, /* → frontend)
- [x] Proxmox — despliegue en servidor local/VM
- [x] GitHub-based deployment workflow (GitHub Actions → GHCR + Watchtower)
- [ ] HTTPS (Let's Encrypt) — verificar si Cloudflare Tunnel ya provee TLS en el borde; quizá solo falta confirmarlo

## Phase 5.5 – Hardening
> **Concepto nuevo:** configuración por entorno, validación en runtime, defensa en profundidad

- [x] **Fix URLs del frontend** — sustituir `http://localhost:3001` hardcodeado por rutas relativas `/api/*` (vía nginx) o `NEXT_PUBLIC_API_URL`. Bug latente: en producción el navegador del visitante intenta conectarse a *su propio* localhost:3001, que no existe
- [x] Validación de entrada con **Zod** en `POST /logros` y `/auth/*` — nunca confiar en el cliente
- [x] **Error handler global** + clases de error centralizadas (patrón de `nodejs-backend-patterns`)
- [x] **Fail-fast al arranque** — validar `JWT_SECRET` y `DATABASE_URL` al iniciar, con mensaje claro si faltan (eliminar el `!` que revienta en runtime de forma críptica)
- [ ] **Rate limiting** en `/auth/login` con `express-rate-limit` — protección básica contra fuerza bruta
- [ ] **Healthcheck** — endpoint `GET /health` en el backend + `healthcheck:` en Docker Compose con `depends_on: condition: service_healthy` (resuelve el clásico "backend arranca antes que la DB")
- [ ] **Backup automático de PostgreSQL** — `pg_dump` programado a un volumen (los datos son lo único irrecuperable; una migración mala con Watchtower auto-desplegando puede destruirlos)
- [ ] `apuntes.md`: sección "Hardening — validación, errores y configuración"

## Phase 6 – Multi-tenancy: modelo de datos (Relaciones en Prisma)
> **Concepto nuevo:** relaciones one-to-many / many-to-many, `@relation`, `@@unique`, rutas dinámicas anidadas

- [ ] Nuevo modelo `Team` — `slug` único, flag `esPublico` (privado: solo miembros; público: lectura para logueados)
- [ ] `Logro` pasa a pertenecer a un equipo (`teamId`) + campos: `descripcion`, `categoria`, `icono` (emoji)
- [ ] Membership `User` ↔ `Team` (un jugador pertenece a un equipo)
- [ ] Nuevo modelo `UserLogro` — junction table (quién ganó qué logro y cuándo)
- [ ] Migración Prisma con las nuevas relaciones
- [ ] Endpoints scoped por equipo: `GET /equipos/:slug/logros`, `GET /equipos/:slug/jugadores/:id/logros`, etc.
- [ ] Frontend: estructura `/equipos/[slug]/...` — dashboard, `/logros`, `/jugadores`, `/jugadores/[id]` (ver mapa en Architecture.md)
- [ ] `apuntes.md`: sección "Prisma — Relaciones y multi-tenancy"

## Phase 7 – Autorización por Roles
> **Concepto nuevo:** autenticación vs autorización, autorización contextual (rol *dentro de* un equipo), middleware composition, seed scripts

- [ ] Roles `SUPER_ADMIN | TEAM_ADMIN | PLAYER` — el rol de TEAM_ADMIN es relativo a SU equipo (scoping)
- [ ] Añadir `role` (y equipo) al payload del JWT en el login
- [ ] Middlewares: `superAdminMiddleware`, `teamAdminMiddleware(slug)` — composición de middlewares
- [ ] Proteger creación/asignación/borrado de logros según rol y equipo
- [ ] Script `prisma/seed.ts` — super admin + 1 equipo + 5 logros de ejemplo (`npm run seed`)
- [ ] `apuntes.md`: sección "Autorización — Roles y middlewares"

## Phase 7.5 – Auth Hardening
> **Concepto nuevo:** seguridad del navegador, XSS, cookies HttpOnly vs localStorage

- [ ] Migrar JWT de `localStorage` a **cookie HttpOnly** — `localStorage` es accesible desde JS (XSS puede robar el token); una cookie HttpOnly no lo es
- [ ] Actualizar `authMiddleware` para leer el JWT desde la cookie en lugar del header `Authorization`
- [ ] Actualizar el frontend para no gestionar el token manualmente (la cookie se envía automáticamente)
- [ ] `apuntes.md`: sección "Cookies HttpOnly vs localStorage"

## Phase 7.6 – Solicitudes y paneles admin
> **Concepto nuevo:** flujos de aprobación (máquina de estados simple), layouts anidados y route groups en Next.js

- [ ] Modelo `SolicitudLogro` — PLAYER reclama un logro (PENDIENTE | APROBADA | RECHAZADA)
- [ ] Endpoints: crear solicitud (PLAYER), aprobar/rechazar (TEAM_ADMIN), asignación directa (TEAM_ADMIN)
- [ ] Página `/equipos/[slug]/solicitudes` — mis solicitudes y su estado (PLAYER)
- [ ] Panel `/equipos/[slug]/admin` — gestión de logros, jugadores y solicitudes del equipo (TEAM_ADMIN)
- [ ] Panel `/admin` — equipos de la plataforma + solicitudes de acceso de nuevos equipos (SUPER_ADMIN)
- [ ] Landing pública `/` (publicidad de la idea) + `/solicitar-acceso` (formulario para equipos)
- [ ] `apuntes.md`: sección "Flujos de aprobación y layouts anidados"

## Phase 8 – Ranking y Aggregaciones SQL
> **Concepto nuevo:** GROUP BY, SUM, COUNT via Prisma y `$queryRaw`

- [ ] Endpoint `GET /equipos/:slug/ranking` — jugadores del equipo por puntos totales
- [ ] Stats del equipo: totales (jugadores, logros otorgados, puntos) y por logro (más conseguido, más raro, último creado)
- [ ] Frontend: página `/equipos/[slug]/ranking` con ranking visual (oro/plata/bronce para el top 3) + stats detalladas
- [ ] Dashboard del equipo (`/equipos/[slug]`): logros recientes + mini-ranking top 3-5 + widgets de stats
- [ ] `apuntes.md`: sección "SQL — Aggregaciones"

## Phase 8.5 – Comunidad de logros
> **Concepto nuevo:** features cross-tenant, copia vs referencia, atribución

- [ ] Publicación de logros: modelo `LogroPublicado` (o flag + atribución sobre `Logro`)
- [ ] Página `/comunidad` — galería navegable de logros publicados; `/comunidad/[id]` — detalle (qué equipos lo implementaron)
- [ ] Acción "implementar": **copia independiente** al catálogo del equipo, con atribución al autor (la copia es editable y no cambia si el original cambia)
- [ ] Proponer publicar/implementar: PLAYER propone → TEAM_ADMIN aprueba (reutiliza el flujo de Phase 7.6)
- [ ] `apuntes.md`: sección "Comunidad — features cross-tenant"

## Phase 9 – UI Component Library (shadcn/ui)
> **Concepto nuevo:** design systems, Radix UI, componentes accesibles, theming, Server vs Client Components

- [ ] Migrar las páginas de lectura (`/equipos/[slug]/logros`, `/equipos/[slug]/logros/[id]`, landing) a **Server Components** — el fetch ocurre en el servidor (mejor SEO y velocidad inicial)
- [ ] Estados de carga y error con `loading.tsx` y `error.tsx` del App Router (Suspense boundaries)
- [ ] Instalar y configurar shadcn/ui en el frontend Next.js
- [ ] Reemplazar Tailwind manual con: Card, Badge, Table, Button, Input, Dialog
- [ ] "Sala de trofeos": grid de cards con iconos grandes, nombre, puntos, cuántos la tienen
- [ ] Toggle dark/light mode con `next-themes`
- [ ] `apuntes.md`: sección "shadcn/ui — Librería de componentes"

## Phase 10 – File Uploads y Assets Estáticos
> **Concepto nuevo:** multipart/form-data, multer, Docker volumes para persistencia

- [ ] Admins pueden subir imagen personalizada para cada logro (reemplaza el emoji)
- [ ] Backend: endpoint `POST /logros/:id/imagen` con `multer`
- [ ] Nginx sirve `/uploads/` directamente sin pasar por Node.js
- [ ] Frontend: preview de imagen antes de subir, fallback al emoji si no hay imagen
- [ ] `apuntes.md`: sección "File uploads — multer y assets estáticos"

## Phase 11 – Testing
> **Concepto nuevo:** pirámide de tests, unit vs integration, TDD básico

- [ ] Backend: tests con Vitest + supertest (rutas /logros, /auth, middlewares)
- [ ] Frontend: React Testing Library para componentes clave (ranking, login form)
- [ ] GitHub Actions: los tests corren **antes** del build de imágenes — si fallan, no se publica a GHCR (CI como gate real, no solo como build)
- [ ] `apuntes.md`: sección "Testing — Vitest y Supertest"

## Phase 12 – Real-Time con WebSockets
> **Concepto nuevo:** conexiones persistentes, event-driven, WebSockets vs HTTP polling

- [ ] `socket.io` en el backend adjunto al servidor HTTP de Express
- [ ] `socket.io-client` en el frontend Next.js
- [ ] Evento `logro:assigned` — toast de notificación en tiempo real al ganar un logro (scoped al equipo)
- [ ] Feed en vivo en el dashboard del equipo (últimas 5 asignaciones)
- [ ] `apuntes.md`: sección "WebSockets — Tiempo real con socket.io"
