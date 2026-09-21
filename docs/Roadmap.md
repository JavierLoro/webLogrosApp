# Roadmap

## Ruta de aprendizaje
JS → TS → Express → PostgreSQL → Docker → Prisma → JWT → Nginx → CI/CD → Proxmox → Hardening → Multi-tenancy (Relaciones DB) → **Frontend V1 code-first** → Roles → Auth Hardening → Solicitudes/Admin → Propuestas → **Visual convergence (image-first)** → Aggregaciones SQL → Comunidad → shadcn/ui → File uploads → Testing → **WebSockets**

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
- [x] Seed data idempotente (`npm run seed`) — equipos, logros, usuarios y asignaciones de prueba

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
- [x] **Rate limiting** en `/auth/login` con `express-rate-limit` — protección básica contra fuerza bruta (también en `/auth/register`; `trust proxy` para nginx)
- [x] **Healthcheck** — endpoint `GET /health` (readiness, `SELECT 1` a la BD, 503 si falla) + `healthcheck:` en Docker Compose (db con `pg_isready`, backend con Node `fetch`) + `depends_on: condition: service_healthy` (resuelve el clásico "backend arranca antes que la DB")
- [x] **Backup automático de PostgreSQL** — sidecar DIY (`postgres:16` + bucle `pg_dump | gzip`, retención 7d con `find -mtime`) a `./backups` (volumen host); `backups/` en `.gitignore` (los datos son lo único irrecuperable; una migración mala con Watchtower auto-desplegando puede destruirlos)
- [x] `apuntes.md`: sección "Hardening — validación, errores y configuración" (fail-fast, error handler, Zod, rate limiting, healthchecks, backup)
- [ ] **Copias offsite del backup** (pasos manuales del host, documentados en apuntes) — cronjob `rsync` a otro disco/CT del Proxmox + opción `rclone` a Google Drive (regla 3-2-1)

## Phase 6 – Multi-tenancy: modelo de datos (Relaciones en Prisma)
> **Concepto nuevo:** relaciones one-to-many / many-to-many, `@relation`, `@@unique`, rutas dinámicas anidadas

- [x] Nuevo modelo `Team` — `slug` único, `nombre` (DECISIÓN: sin `esPublico`; los logros de un equipo son SIEMPRE privados a sus miembros. La reutilización entre equipos se hace por publicación *a nivel de logro* en Phase 8.5, no por equipos públicos)
- [x] `Logro` pasa a pertenecer a un equipo (`teamId`) + campos: `descripcion`, `categoria`, `icono` (emoji). DECISIÓN: `Logro` es la INSTANCIA del equipo; la PLANTILLA proponible/comunitaria (con `firma`/atribución) es una tabla aparte en Phase 8.5, no ahora
- [x] Membership `User` ↔ `Team` (un jugador pertenece a un equipo) — `teamId Int?` opcional (super admin / recién registrado sin equipo)
- [x] Nuevo modelo `UserLogro` — junction table explícita (`fecha` + `@@unique([userId, logroId])`)
- [x] Migración Prisma con las nuevas relaciones (`add_multitenancy`, vía reset en dev)
- [x] **Endpoints scoped por equipo**: `routes/equipos.ts` montado en `/equipos/:slug` (`mergeParams` + `router.use(resolveTeam)`). `GET /logros`, `GET /logros/:id` (con doble filtro `id`+`teamId` anti-fuga), `POST /logros` (auth + `teamId` desde `req.team`, no del body). Viejo `routes/logros.ts` borrado. Verificado en vivo: aislamiento entre Halcones/Lobos, 404 cross-tenant, 401 sin token. `apuntes.md` actualizado.
- [ ] Endpoints scoped restantes: `GET /equipos/:slug/jugadores/:id/logros`, etc. (cuando existan jugadores/UserLogro en la API)
- [x] Frontend **(a) esqueleto de rutas** — `app/equipos/[slug]/layout.tsx` (layout anidado con nav del equipo, segmento dinámico `[slug]`, `<Link>`) + 13 páginas placeholder de todo el mapa (componente `Placeholder` reutilizable). Borrados `/logros`, `NuevoLogro` y el fetch muerto de la landing. Verificado: 15 rutas responden 200, `/logros` viejo 404. DECISIONES: esqueleto de todas las rutas · empezar limpio · slug manual por URL hasta que haya roles (Phase 7)
- [x] Frontend **(b) pantallas reales** — catálogo, detalle y crear logro cableados a los endpoints scoped. Se implementa en **Phase 6.5** como frontend V1 code-first.
- [x] `apuntes.md`: sección "Prisma — Relaciones y multi-tenancy"

## Phase 6.5 – Frontend V1 (code-first)
> **Nota histórica:** esta fase define la primera UI funcional. El trabajo visual activo posterior ya no es code-first: se gestiona mediante el workstream image-first de [ui-workstream/README.md](ui-workstream/README.md).
>
> **Concepto nuevo:** construir una UI usable directamente desde el contrato de rutas/API, con estados explícitos, responsive y accesibilidad.
>
> El frontend se implementa de forma autónoma y code-first. No depende de Figma ni de un proceso previo de mockups; las decisiones visuales se validan en el navegador junto con el comportamiento real de la aplicación.

- [x] Landing pública: propuesta de valor y acceso a registro/login
- [x] Auth: login, registro, sesión y estados de error/401
- [x] Shell tenant para `/equipos/[slug]`: navegación, identidad del equipo y responsive
- [x] Dashboard básico derivado del catálogo disponible (resumen y accesos; sin ranking ni stats de agregación)
- [x] Catálogo de logros scoped por equipo
- [x] Detalle de logro scoped por equipo
- [x] Crear logro scoped por equipo, conectado al endpoint existente
- [x] Estados explícitos en las pantallas V1: loading, error, empty, 401 y 404
- [x] Responsive mobile-first y navegación usable con teclado
- [x] Accesibilidad básica: landmarks, labels, foco visible, contraste y mensajes asociados a controles
- [ ] **Bloqueado por backend:** ranking, jugadores y comunidad; solicitudes de logro y panel TEAM_ADMIN ya están disponibles

## Phase 7 – Autorización por Roles
> **Concepto nuevo:** autenticación vs autorización, autorización contextual (rol *dentro de* un equipo), middleware composition, seed scripts

- [x] Roles `SUPER_ADMIN | TEAM_ADMIN | PLAYER` — `isSuperAdmin` global y `TeamMembership.role` contextual por equipo
- [x] Login devuelve las membresías y roles actuales; el JWT conserva solo `userId` para no congelar permisos contextuales
- [x] Middlewares `requireSuperAdmin`, `requireTeamMember` y `requireTeamAdmin`
- [x] Proteger lectura, creación y asignación de logros según membresía/rol y equipo
- [x] Script `prisma/seed.ts` idempotente — super admin, equipos, membresías, logros y asignaciones (`npm run seed:dev`)
- [x] `apuntes.md`: autorización, roles contextuales y seed idempotente

## Phase 7.5 – Auth Hardening
> **Concepto nuevo:** seguridad del navegador, XSS, cookies HttpOnly vs localStorage

- [ ] Migrar JWT de `localStorage` a **cookie HttpOnly** — `localStorage` es accesible desde JS (XSS puede robar el token); una cookie HttpOnly no lo es
- [ ] Actualizar `authMiddleware` para leer el JWT desde la cookie en lugar del header `Authorization`
- [ ] Actualizar el frontend para no gestionar el token manualmente (la cookie se envía automáticamente)
- [ ] `apuntes.md`: sección "Cookies HttpOnly vs localStorage"

## Phase 7.6 – Solicitudes y paneles admin
> **Concepto nuevo:** flujos de aprobación (máquina de estados simple), layouts anidados y route groups en Next.js

- [x] Modelo `SolicitudLogro` — PLAYER reclama un logro (PENDIENTE | APROBADA | RECHAZADA)
- [x] Endpoints: crear solicitud (PLAYER), aprobar/rechazar (TEAM_ADMIN), asignación directa (TEAM_ADMIN)
- [x] Página `/equipos/[slug]/solicitudes` — mis solicitudes y su estado (PLAYER)
- [x] Panel `/equipos/[slug]/admin` — solicitudes, asignación directa e invitaciones (TEAM_ADMIN)
- [x] Panel `/admin` — equipos de la plataforma + solicitudes de acceso de nuevos equipos (SUPER_ADMIN)
- [x] Landing pública `/` (publicidad de la idea) + `/solicitar-acceso` (formulario para equipos)
- [x] `apuntes.md`: sección "Solicitudes de logro" y aceptación transaccional

## Phase 7.7 – Propuestas de nuevos logros (acordado, pendiente)

Decisión de producto del 2026-09-17. Amplía Phase 7.6; sus tareas completadas siguen describiendo solicitudes de obtención de logros existentes. No sustituye el foco actual de Auth Hardening.

- [ ] Permitir a cualquier miembro proponer un logro nuevo para su equipo: nombre, descripción, criterios e imagen (coordinar subida de imágenes con Phase 10).
- [ ] Mantener equipo y autor desde el envío; estados pendiente, aprobada y rechazada con motivo. Solo la aprobación incorpora el logro al catálogo; mantener creación directa administrativa.
- [ ] Flujo secuencial: aprobar propuesta e incorporar al catálogo; después permitir al jugador solicitar la obtención desde el detalle. Sin solicitud simultánea, automática ni puntos por proponer.
- [ ] Adaptar `/equipos/[slug]/logros/nuevo` al rol; separar propuestas y solicitudes de obtención en el historial personal y panel admin.
- [ ] Dividir el panel administrativo en resumen y subrutas invitaciones, jugadores, logros, solicitudes y propuestas; detalles solicitudes/[id] y propuestas/[id]. Mantener navegación compartida, enlaces directos, estados por área y permisos contextuales. Referencias ya reorganizadas; páginas aún pendientes.
- [ ] Definir persistencia y API; verificar aislamiento entre equipos, permisos, rechazo y aprobaciones repetidas sin duplicar logros ni asignaciones.
- [ ] Completar referencias de propuesta, revisión y estados; documentar implementación y conceptos en `apuntes.md` cuando se construya.


## UI Workstream V2 – Visual convergence (ACTIVE)

Pendientes de backend detectados en acceso/onboarding: [BACKEND-GAPS.md](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). Consultar este registro al planificar futuras tareas de backend: incluye estadísticas y deporte de equipos, identidad global, seguimiento de solicitudes y notificaciones, distinguiendo datos faltantes de decisiones aún pendientes. El documento no marca estas capacidades como implementadas ni autoriza adelantarlas dentro del workstream visual; su ejecución requiere alcance explícito.

> Workstream de entrega paralelo al itinerario pedagógico. La fuente operativa está en [ui-workstream/README.md](ui-workstream/README.md), con estado reanudable en [ui-workstream/STATUS.md](ui-workstream/STATUS.md).
>
> Las imágenes canónicas ya están inventariadas bajo `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`. Son autoridad visual, mientras que Architecture/Roadmap siguen siendo autoridad funcional.
>
> Astra Low es el perfil por defecto y **Critic != Implementer**.

- [x] **UI-G0 — Reference inventory/manifest**: inventario existente reconciliado y manifest machine-readable apuntando a referencias canónicas
- [ ] **UI-G0 — Visual extraction**: extraer tokens, shell y reglas comunes de las referencias vigentes
- [ ] **UI-G1 — Visual Fixtures + Domain Slice**: seed determinista, ranking/jugadores/stats y soporte mínimo de propuestas acordadas
- [ ] **UI-G2 — Shared Shell**: navegación, tokens, superficies y componentes comunes; congelar al aprobar
- [ ] **UI-G3 — Dashboard**: `/equipos/[slug]`
- [ ] **UI-G4 — Achievements**: catálogo + creación/propuesta según rol
- [ ] **UI-G5 — Ranking**: `/equipos/[slug]/ranking`
- [ ] **UI-G6 — Players**: `/equipos/[slug]/jugadores`
- [ ] **UI-G7 — Requests / My proposals**: historial personal y detalles respaldados por las referencias vigentes
- [ ] **UI-G8 — Team Admin**: resumen + subrutas acordadas de invitaciones, jugadores, logros, solicitudes y propuestas
- [ ] **UI-G9 — Consistency Pass**: regresión visual, responsive base y gates finales
- [ ] Assets reales de logros/avatares/banners y uploads quedan fuera de esta primera pasada; se preserva su geometría con placeholders hasta Phase 10.

## Phase 8 – Ranking y Aggregaciones SQL
> **Concepto nuevo:** GROUP BY, SUM, COUNT via Prisma y `$queryRaw`

- [ ] Endpoint `GET /equipos/:slug/ranking` — jugadores del equipo por puntos totales
- [ ] Stats del equipo: totales (jugadores, logros otorgados, puntos) y por logro (más conseguido, más raro, último creado)
- [ ] Frontend: página `/equipos/[slug]/ranking` con ranking visual (oro/plata/bronce para el top 3) + stats detalladas
- [ ] Dashboard del equipo (`/equipos/[slug]`): logros recientes + mini-ranking top 3-5 + widgets de stats
- [ ] `apuntes.md`: sección "SQL — Aggregaciones"

## Phase 8.5 – Comunidad de logros
> **Concepto nuevo:** features cross-tenant, copia vs referencia, atribución

- [ ] Publicación de logros: **tabla PLANTILLA separada** (`PlantillaLogro`/`LogroPublicado`) distinta del `Logro`-instancia del equipo — decidido en Phase 6. Lleva `firma` (`@default("anonimo")`, autoría *display* que elige el proponente) + atribución al autor real. El `Logro` del equipo es una COPIA de la plantilla
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
