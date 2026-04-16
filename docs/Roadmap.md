# Roadmap

## Ruta de aprendizaje
JS → TS → Express → PostgreSQL → Docker → Prisma → Next.js → JWT → Nginx → Proxmox → Relaciones DB → Roles → Aggregaciones SQL → shadcn/ui → File uploads → Testing → **WebSockets**

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
- [ ] HTTPS (Let's Encrypt)
- [ ] GitHub-based deployment workflow

## Phase 6 – Rich Data Model (Relaciones en Prisma)
> **Concepto nuevo:** relaciones one-to-many / many-to-many, `@relation`, `@@unique`

- [ ] Extender `Logro` con campos: `descripcion`, `categoria`, `icono` (emoji)
- [ ] Añadir campo `role` (USER | ADMIN) a `User`
- [ ] Nuevo modelo `UserLogro` — junction table (quién ganó qué logro y cuándo)
- [ ] Migración Prisma con las nuevas relaciones
- [ ] Nuevos endpoints: `GET /users/:id/logros`, `POST /users/:id/logros/:logroId`
- [ ] `apuntes.md`: sección "Prisma — Relaciones"

## Phase 7 – Autorización por Roles
> **Concepto nuevo:** autenticación vs autorización, middleware composition, seed scripts

- [ ] `adminMiddleware` — verifica `role === ADMIN` en el JWT
- [ ] Añadir `role` al payload del JWT en el login
- [ ] Proteger creación/asignación/borrado de logros solo para admins
- [ ] Script `prisma/seed.ts` — primer admin + 5 logros de ejemplo (`npm run seed`)
- [ ] `apuntes.md`: sección "Autorización — Roles y middlewares"

## Phase 8 – Leaderboard y Aggregaciones SQL
> **Concepto nuevo:** GROUP BY, SUM, COUNT via Prisma y `$queryRaw`

- [ ] Nuevo endpoint `GET /leaderboard` — top 10 usuarios por puntos totales
- [ ] Actualizar `GET /logros` para incluir cuántos usuarios han ganado cada logro
- [ ] Frontend: página `/leaderboard` con ranking visual (oro/plata/bronce para el top 3)
- [ ] `apuntes.md`: sección "SQL — Aggregaciones"

## Phase 9 – UI Component Library (shadcn/ui)
> **Concepto nuevo:** design systems, Radix UI, componentes accesibles, theming

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
- [ ] Frontend: React Testing Library para componentes clave (leaderboard, login form)
- [ ] GitHub Actions: paso CI que ejecuta tests en cada push y bloquea el merge si fallan
- [ ] `apuntes.md`: sección "Testing — Vitest y Supertest"

## Phase 12 – Real-Time con WebSockets
> **Concepto nuevo:** conexiones persistentes, event-driven, WebSockets vs HTTP polling

- [ ] `socket.io` en el backend adjunto al servidor HTTP de Express
- [ ] `socket.io-client` en el frontend Next.js
- [ ] Evento `logro:assigned` — toast de notificación en tiempo real al ganar un logro
- [ ] Feed en vivo en la página de leaderboard (últimas 5 asignaciones)
- [ ] `apuntes.md`: sección "WebSockets — Tiempo real con socket.io"
