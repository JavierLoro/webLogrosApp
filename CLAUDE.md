# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Para el estado y el flujo vigentes, leer [AGENTS.md](AGENTS.md), [STATUS](docs/ui-workstream/STATUS.md), [TASKS](docs/ui-workstream/TASKS.md) y [PLAN](docs/ui-workstream/PLAN.md). Los overrides documentados del usuario prevalecen sobre los contratos generales; actualmente las comparaciones visuales pendientes corresponden directamente al Coordinator.

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
**Trigger:** al comprobar, verificar, editar o revisar backend o sus decisiones de arquitectura. Según AGENTS.md, no se exigen comentarios pedagógicos nuevos para el frontend; se preservan los existentes.

Tras confirmar que el código funciona, anótalo con comentarios pedagógicos con prefijo `// 📚`: (a) el *porqué* de cada clase/función/decisión, y (b) las líneas donde se aplicó un concepto que el usuario está aprendiendo (super(), never/narrowing, instanceof, rutas relativas `/api`, JWT, parameter properties, fail-fast, orden de dotenv…). Protocolo completo en `.claude/skills/learning-comments/SKILL.md`.

## nodejs-backend-patterns
**Trigger:** al implementar rutas Express, middleware, controllers, servicios, repositorios o error handling en el backend.

Referencia de patrones de producción: arquitectura en capas, auth/validación/logging, clases de error, handler global.

## nodejs-best-practices
**Trigger:** al tomar decisiones de arquitectura o selección de framework en el backend.

Enseña a pensar, no a copiar: decision tree de frameworks, principios de async, validación, seguridad, testing.

---

## IMPORTANTE — Contexto de aprendizaje

> Este proyecto es un entorno de aprendizaje progresivo de backend e infraestructura. Aplicar estas reglas al backend; el frontend visual sigue `docs/ui-workstream/`:
>
> 1. **Explicar antes de implementar.** Antes de escribir cualquier código nuevo, explicar el concepto que se va a aplicar (qué es, por qué se usa, cómo encaja en lo ya aprendido).
> 2. **Documentar cada bloque backend nuevo en `docs/apuntes.md`** al terminar de implementarlo.
> 3. El usuario está aprendiendo desde cero — adaptar el nivel de explicación en consecuencia.
> 4. **Comentar el código backend con notas pedagógicas `// 📚`** cada vez que se comprueba/revisa: el porqué de clases/funciones/decisiones y las líneas de conceptos aprendidos. El código es material de estudio.
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
- `server.ts` — punto de entrada; autenticación y rutas scoped por equipo, según `docs/Architecture.md`
- `routes/auth.ts` — registro/login con JWT en cookie HttpOnly, lectura de sesión y logout
- `routes/equipos.ts` — resuelve el equipo y sus lecturas/operaciones protegidas; las antiguas rutas públicas `/logros` fueron sustituidas
- `middleware/auth.ts` — verifica el JWT de la cookie `auth_token`, inyecta `req.userId`
- `lib/prisma.ts` — instancia singleton de PrismaClient

### Frontend (`apps/frontend/src/app/`)
- App Router de Next.js. La sesión se consulta al servidor; el frontend no almacena el JWT en `localStorage` ni lo envía como Bearer.
- Las pantallas de equipo viven bajo `/equipos/[slug]`; las peticiones usan el contrato `/api`/configuración de entorno, sin URL localhost fija para visitantes.
- Shell, dashboard, catálogo/formulario por rol y ranking tienen gates cerrados. Jugadores está implementado con QA/gate pendiente; historiales y administración renovados siguen pendientes.
- Acceso y onboarding están implementados y en revisión. Continuar desde STATUS/TASKS; no inferir la tarea activa a partir de la numeración del roadmap.

### Base de datos
- PostgreSQL en Docker, contenedor `weblogros_db`
- Credenciales locales: `admin:admin123`, db `weblogros`, puerto `5432`
- Modelo de datos: equipos, usuarios, membresías/roles contextuales, logros, concesiones, invitaciones, solicitudes y propuestas. Identidad global/alias y temporadas están descritos en `docs/Architecture.md`; consultar Roadmap para validación y migración pendientes de temporadas.
- `apps/backend/.env` contiene `DATABASE_URL` y `JWT_SECRET`

### Variables de entorno necesarias (`apps/backend/.env`)
```
DATABASE_URL="postgresql://admin:admin123@localhost:5432/weblogros"
JWT_SECRET="..."
```

## Estado actual del roadmap
Conciliado el 2026-09-22. Base, equipos, roles, seed y administración V1 completados en su alcance. Confirmación de HTTPS y copias offsite pendientes. Sesiones con cookies HttpOnly completadas y verificadas manualmente. Ranking/estadísticas, backend de propuestas y formulario por rol ya entregados; identidad global/alias implementados y validados localmente. Temporadas parcialmente implementadas, con migración aplicada, pruebas HTTP y pantallas pendientes.

Foco: **UI-A2-T04**; UI-A1-T04 sigue en curso. Gates UI-G0–G5 cerrados, UI-G6-T01/T02 DONE y continuación pausada en UI-G6-T03; UI-G7–G9 pendientes. Fuente de estado: [Roadmap](docs/Roadmap.md) y [STATUS](docs/ui-workstream/STATUS.md). Funciones detectadas por el frontal: [BACKEND-GAPS](docs/ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). No equiparar implementación local con despliegue ni cierre remoto de issues.
