# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# MemPalace Integration

Tienes acceso a MemPalace — sistema de memoria persistente vía MCP tools (`mcp__mempalace__*`).

## Al inicio de sesión
1. Llama `mcp__mempalace__mempalace_status` para cargar el overview del palace.
2. Llama `mcp__mempalace__mempalace_get_aaak_spec` si vas a escribir entradas de diario.

## Al guardar contexto de sesión (stop hook lo hace automáticamente)
- `mcp__mempalace__mempalace_diary_write` — resumen AAAK de la sesión (agent_name: "claude-sonnet-4-6")
- `mcp__mempalace__mempalace_add_drawer` — citas verbatim, decisiones, snippets (wing: "weblogrosapp")
- `mcp__mempalace__mempalace_kg_add` — relaciones entre entidades (opcional)

## Palace actual
- Wing: `weblogrosapp` | Rooms: documentation, frontend, backend, general, shared
- Conversaciones: `conversations/` — guardar sesiones en .md y minar con `--mode convos --extract general`

---

# Skills disponibles

Instaladas en `.claude/skills/` — se cargan automáticamente en cada sesión.

## progressive-tutor ⭐ (skill primaria de este proyecto)
**Trigger:** cuando el usuario quiere aprender mientras construye, pide explicaciones, dice "enséñame", "quiero entender", "no me des el código", o cualquier variante de intención de aprendizaje activo.

Explica el concepto ANTES de implementar (qué es, por qué se usa, cómo conecta con lo anterior), guía paso a paso sin escribir el código por el usuario. Protocolo completo en `.claude/skills/progressive-tutor/SKILL.md`.

## learning-comments ⭐ (complementa a progressive-tutor)
**Trigger:** SIEMPRE que compruebes, verifiques, edites o revises código (backend o frontend). No es opcional: comentar es parte de "comprobar código".

Tras confirmar que el código funciona, anótalo con comentarios pedagógicos con prefijo `// 📚`: (a) el *porqué* de cada clase/función/decisión, y (b) las líneas donde se aplicó un concepto que el usuario está aprendiendo (super(), never/narrowing, instanceof, rutas relativas `/api`, JWT, parameter properties, fail-fast, orden de dotenv…). Protocolo completo en `.claude/skills/learning-comments/SKILL.md`.

## nodejs-backend-patterns
**Trigger:** al implementar rutas Express, middleware, controllers, servicios, repositorios o error handling en el backend.

Referencia de patrones de producción: arquitectura en capas, auth/validación/logging, clases de error, handler global.

## nodejs-best-practices
**Trigger:** al tomar decisiones de arquitectura o selección de framework en el backend.

Enseña a pensar, no a copiar: decision tree de frameworks, principios de async, validación, seguridad, testing.

---

## IMPORTANTE — Contexto de aprendizaje

> Este proyecto es un entorno de aprendizaje progresivo. Aplica siempre estas reglas, sin excepción:
>
> 1. **Explicar antes de implementar.** Antes de escribir cualquier código nuevo, explicar el concepto que se va a aplicar (qué es, por qué se usa, cómo encaja en lo ya aprendido).
> 2. **Documentar cada bloque nuevo en `docs/apuntes.md`** al terminar de implementarlo.
> 3. El usuario está aprendiendo desde cero — adaptar el nivel de explicación en consecuencia.
> 4. **Comentar el código con notas pedagógicas `// 📚`** cada vez que se comprueba/revisa: el porqué de clases/funciones/decisiones y las líneas de conceptos aprendidos. El código es material de estudio.
>
> **Nota:** Usa las skills `progressive-tutor` (enseñar antes de escribir) y `learning-comments` (anotar después de verificar) como guías operativas completas. Las reglas anteriores son el resumen; las skills tienen el protocolo detallado.

## Descripción del proyecto
Plataforma **multi-tenant** de logros: se ofrece a equipos y cada uno recibe su espacio propio (`/equipos/[slug]`) con sus jugadores, logros, ranking y stats. Roles: `SUPER_ADMIN` (dueño plataforma) · `TEAM_ADMIN` (por equipo) · `PLAYER`. Mapa de rutas completo en `docs/Architecture.md`. Proyecto de aprendizaje progresivo:
**JS → TS → Express → PostgreSQL → Docker → Prisma → Next.js → JWT → Nginx → Proxmox**

## Arrancar el proyecto

```bash
# 1. Base de datos (Docker)
docker-compose up -d

# 2. Backend (puerto 3001)
cd apps/backend && npm run dev

# 3. Frontend (puerto 3000)
cd apps/frontend && npm run dev
```

### Producción (todo en Docker)
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Comandos útiles

```bash
# Backend: compilar TypeScript
cd apps/backend && npm run build

# Frontend: lint
cd apps/frontend && npm run lint

# Prisma: nueva migración
cd apps/backend && npx prisma migrate dev --name <nombre>

# Prisma: regenerar cliente tras cambiar schema
cd apps/backend && npx prisma generate

# Prisma: abrir Prisma Studio
cd apps/backend && npx prisma studio

# MemPalace (Windows — siempre con PYTHONUTF8=1)
PYTHONUTF8=1 python -m mempalace status
PYTHONUTF8=1 python -m mempalace mine . --extract general
PYTHONUTF8=1 python -m mempalace mine conversations/ --mode convos --extract general
PYTHONUTF8=1 python -m mempalace search "<consulta>"
```

## Arquitectura

### Monorepo manual (sin Turborepo ni workspaces)
```
apps/backend/   — Express 5 + TypeScript + Prisma + PostgreSQL
apps/frontend/  — Next.js 16 + React 19 + Tailwind CSS 4
infra/nginx/    — Reverse proxy: /api/* → backend:3001, /* → frontend:3000
```

### Backend (`apps/backend/src/`)
- `server.ts` — punto de entrada: monta CORS manual, rutas `/auth` y `/logros`
- `routes/auth.ts` — `POST /register` y `POST /login` (bcryptjs + JWT, 7d de expiración)
- `routes/logros.ts` — `GET /` y `GET /:id` son públicos; `POST /` requiere `authMiddleware`
- `middleware/auth.ts` — verifica `Authorization: Bearer <token>`, inyecta `req.userId`
- `lib/prisma.ts` — instancia singleton de PrismaClient

### Frontend (`apps/frontend/src/app/`)
- App Router de Next.js. Las páginas de auth (`/login`, `/register`) son Client Components que guardan el JWT en `localStorage`.
- El `Header` usa `usePathname` + `useEffect` para detectar sesión activa (Client Component).
- `NuevoLogro` envía el token via `Authorization: Bearer` header al backend.
- Las rutas públicas (`/logros`, `/logros/[id]`) hacen fetch directo al backend en `http://localhost:3001`.

### Base de datos
- PostgreSQL en Docker, contenedor `weblogros_db`
- Credenciales locales: `admin:admin123`, db `weblogros`, puerto `5432`
- Schema Prisma: modelos `Logro` (id, nombre, puntos) y `User` (id, email, password)
- `apps/backend/.env` contiene `DATABASE_URL` y `JWT_SECRET`

### Variables de entorno necesarias (`apps/backend/.env`)
```
DATABASE_URL="postgresql://admin:admin123@localhost:5432/weblogros"
JWT_SECRET="..."
```

## Estado actual del roadmap
Fases 1–3 completadas (base, web pública, auth JWT). Fase 4 parcial (sin seed). Fase 5 casi completa (Docker + Nginx + CI/CD a GHCR + Watchtower + Proxmox listos; falta HTTPS). Siguiente: **Phase 5.5** — hardening (fix URLs frontend, Zod, error handler, fail-fast, rate limiting, healthcheck, backup DB), luego **Phase 6** — relaciones en Prisma (`UserLogro`, roles).
