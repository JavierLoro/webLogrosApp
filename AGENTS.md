# AGENTS.md

This file provides project-wide guidance to coding agents working in this repository.

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

Instaladas en `.agents/skills/` — Codex las descubre automáticamente en cada sesión.

## progressive-tutor ⭐ (skill primaria de este proyecto)
**Trigger:** cuando el usuario quiere aprender mientras construye, pide explicaciones, dice "enséñame", "quiero entender", "no me des el código", o cualquier variante de intención de aprendizaje activo.

Explica el concepto ANTES de implementar (qué es, por qué se usa, cómo conecta con lo anterior), guía paso a paso sin escribir el código por el usuario. Protocolo completo en `.agents/skills/progressive-tutor/SKILL.md`.

## learning-comments ⭐ (complementa a progressive-tutor)
**Trigger:** siempre que compruebes, verifiques, edites o revises código del backend, o tomes/revises decisiones de arquitectura backend. No se exige para el frontend V1 code-first.

Tras confirmar que el código funciona, anótalo con comentarios pedagógicos con prefijo `// 📚`: (a) el *porqué* de cada clase/función/decisión, y (b) las líneas donde se aplicó un concepto que el usuario está aprendiendo (super(), never/narrowing, instanceof, rutas relativas `/api`, JWT, parameter properties, fail-fast, orden de dotenv…). Protocolo completo en `.agents/skills/learning-comments/SKILL.md`.

## nodejs-backend-patterns
**Trigger:** al implementar rutas Express, middleware, controllers, servicios, repositorios o error handling en el backend.

Referencia de patrones de producción: arquitectura en capas, auth/validación/logging, clases de error, handler global.

## nodejs-best-practices
**Trigger:** al tomar decisiones de arquitectura o selección de framework en el backend.

Enseña a pensar, no a copiar: decision tree de frameworks, principios de async, validación, seguridad, testing.

---

## IMPORTANTE — Contexto de aprendizaje

> Este proyecto es un entorno de aprendizaje progresivo para backend e infraestructura. Aplica estas reglas al código backend y a las decisiones de arquitectura backend:
>
> 1. **Explicar antes de implementar.** Antes de escribir cualquier código nuevo, explicar el concepto que se va a aplicar (qué es, por qué se usa, cómo encaja en lo ya aprendido).
> 2. **Documentar cada bloque backend nuevo en `docs/apuntes.md`** al terminar de implementarlo.
> 3. El usuario está aprendiendo desde cero — adaptar el nivel de explicación en consecuencia.
> 4. **Comentar el código backend con notas pedagógicas `// 📚`** cada vez que se comprueba/revisa: el porqué de clases/funciones/decisiones y las líneas de conceptos aprendidos. El código es material de estudio.

### Alcance de estas reglas

El aprendizaje guiado y `learning-comments` se conservan para el backend y para las decisiones de arquitectura backend. La Frontend V1 original se implementó code-first; el rediseño visual activo se rige por el workstream image-first de `docs/ui-workstream/`. Se preservan los comentarios frontend existentes, pero no se exigen comentarios pedagógicos nuevos `// 📚` ni una entrada en `docs/apuntes.md` por cada bloque frontend.

> **Nota:** Usa `progressive-tutor` (enseñar antes de escribir) y `learning-comments` (anotar después de verificar) como guías operativas para backend. Las reglas anteriores son el resumen; las skills tienen el protocolo detallado.

## Adaptive Coordinator / Agent Router

El punto de entrada normal del usuario es **una única sesión raíz**. Esa sesión actúa como Coordinator y decide automáticamente cómo ejecutar la tarea actual. El usuario no tiene que seleccionar workers ni coordinar una flota manualmente.

Contratos:
- `docs/ui-workstream/roles/COORDINATOR.md`
- `docs/ui-workstream/roles/FRONTEND_WORKER.md`
- `docs/ui-workstream/roles/BACKEND_WORKER.md`
- `docs/ui-workstream/roles/VISUAL_CRITIC.md`
- `docs/ui-workstream/roles/QA_CAPTURE.md`
- índice y aliases: `docs/ui-workstream/roles/README.md`

Codex dispone además de perfiles de proyecto en `.codex/agents/*.toml`. Esos perfiles no fijan un model ID: heredan la configuración de la sesión padre y aplican el contrato del rol.

### Resolución automática

Cuando el usuario pida continuar el plan o ejecutar la siguiente tarea:

1. La sesión raíz lee `docs/ui-workstream/STATUS.md`.
2. Resuelve `current_task` en `TASKS.md` y sus dependencias/gate en `PLAN.md`.
3. Usa el campo **Rol principal** y la naturaleza real de la tarea para elegir:
   - frontend/shell/screen/admin UI → `frontend_worker`;
   - backend/schema/seed/API/fixtures → `backend_worker`;
   - ejecución, lint/build/tests/screenshots → `qa_capture`;
   - análisis o aprobación visual → `visual_critic`;
   - coordinación/documentación/control-plane → Coordinator.
4. La delegación es **secuencial por defecto**. Solo paralelizar trabajo realmente independiente, sin archivos/estado mutable compartido y cuando el gate de fase lo permita.
5. Para una pantalla, coordinar automáticamente el ciclo:
   `frontend_worker → qa_capture → visual_critic → frontend_worker → ... → Coordinator`.
6. **Critic != Implementer** siempre. El critic no edita la implementación que revisa.
7. Si el runtime no soporta subagentes, el Coordinator puede ejecutar directamente roles no críticos. Nunca debe autoaprobar visualmente su propia implementación: dejará un handoff para una sesión/agente independiente.

### Control plane

Solo el Coordinator modifica por defecto:
- `docs/ui-workstream/STATUS.md`;
- `docs/ui-workstream/TASKS.md`;
- `docs/ui-workstream/PLAN.md`.

Los subagentes devuelven evidencia, archivos modificados, validaciones y bloqueos. No marcan una tarea como DONE ni avanzan `current_task` salvo delegación explícita.

El Coordinator verifica el gate antes de actualizar el estado. No avanza solo porque un worker declare que terminó.

---

## Workstream UI visual activo

Cuando la tarea afecte al frontend visual, navegación tenant, fixtures usados por las pantallas o captura/comparación de screenshots:

1. Leer primero `docs/ui-workstream/STATUS.md`.
2. Leer la tarea actual en `docs/ui-workstream/TASKS.md` y sus dependencias en `docs/ui-workstream/PLAN.md`.
3. Consultar `docs/ui-reference/manifest.json`. Las imágenes canónicas viven en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`; no duplicarlas ni reconstruirlas desde memoria.
4. Aplicar la skill `.agents/skills/image-to-code/SKILL.md`.
5. Perfil de ejecución por defecto: **Astra Low**. No escalar a modelos high por defecto; solo hacerlo si una tarea concreta queda bloqueada y se documenta el motivo.
6. **Critic != Implementer**: quien implementa una pantalla no puede ser quien la dé por cerrada visualmente. Si solo hay un runtime, usar sesiones/agentes separados con roles distintos.
7. Antes de congelar el shell común, no paralelizar pantallas que puedan modificar navegación, tokens o componentes compartidos.
8. No integrar todavía imágenes reales de logros, avatares, banners ni fotografía decorativa. Mantener su geometría mediante placeholders y excluir esas regiones del juicio visual cuando corresponda.
9. Las referencias son autoridad para composición y estilo; `docs/Architecture.md`, `docs/Roadmap.md` y las decisiones documentadas son autoridad funcional. Una idea futura dibujada en un mockup no se convierte automáticamente en requisito.
10. Los cambios backend exigidos por fixtures, propuestas o endpoints siguen sujetos a progressive-tutor, learning-comments y actualización de `docs/apuntes.md`.
11. Al cerrar una tarea, actualizar `TASKS.md` y `STATUS.md` en el mismo cambio.

Fuente operativa: `docs/ui-workstream/README.md`.

### Pendientes de backend detectados durante el rediseño

Consultar y mantener [BACKEND-GAPS.md](docs/ui-workstream/evidence/UI-A2/BACKEND-GAPS.md) para los datos y capacidades faltantes de acceso/onboarding (equipos, invitaciones y solicitudes). Distingue requisitos aprobados, decisiones pendientes y comportamiento provisional del frontend. Registrar allí los nuevos hallazgos de este alcance y consultarlo antes de planificar su implementación backend. Su registro no autoriza cambios de backend, schema o APIs durante el rediseño: requieren una tarea y alcance explícitamente aprobados. No sustituir datos ausentes por valores ficticios.

---

## Descripción del proyecto
Plataforma **multi-tenant** de logros: se ofrece a equipos y cada uno recibe su espacio propio (`/equipos/[slug]`) con sus jugadores, logros, ranking y stats. Roles: `SUPER_ADMIN` (dueño plataforma) · `TEAM_ADMIN` (por equipo) · `PLAYER`. Mapa de rutas completo en `docs/Architecture.md`. Proyecto de aprendizaje progresivo principalmente backend/infraestructura:
**JS → TS → Express → PostgreSQL → Docker → Prisma → JWT → Nginx → Proxmox**

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
- `server.ts` — punto de entrada: monta CORS manual, rutas `/auth` y `/equipos/:slug`
- `routes/auth.ts` — `POST /register` y `POST /login` (bcryptjs + JWT, 7d de expiración)
- `routes/equipos.ts` — resuelve el tenant y expone los endpoints scoped de logros (`GET /`, `GET /:id`, `POST /`)
- `middleware/auth.ts` — verifica `Authorization: Bearer <token>`, inyecta `req.userId`
- `lib/prisma.ts` — instancia singleton de PrismaClient

### Frontend (`apps/frontend/src/app/`)
- App Router de Next.js. La V1 nació code-first; el rediseño visual actual es image-first y sigue `docs/ui-workstream/`.
- Incluye landing, auth, shell tenant, dashboard básico, catálogo, detalle, creación de logro, solicitudes de obtención y paneles administrativos funcionales en su alcance actual.
- Ranking y jugadores requieren el read slice definido en el workstream; propuestas de nuevos logros y las subrutas administrativas acordadas siguen pendientes de implementación.
- La UI debe contemplar estados loading/error/empty/401/403/404, responsive y accesibilidad.

### Base de datos
- PostgreSQL en Docker, contenedor `weblogros_db`
- Credenciales locales: `admin:admin123`, db `weblogros`, puerto `5432`
- Schema Prisma: `Team`, `User`, `Logro` y `UserLogro`, con logros scoped por `teamId`
- `apps/backend/.env` contiene `DATABASE_URL` y `JWT_SECRET`

### Variables de entorno necesarias (`apps/backend/.env`)
```
DATABASE_URL="postgresql://admin:admin123@localhost:5432/weblogros"
JWT_SECRET="..."
```

## Estado actual del roadmap
Fases 1–4 completadas. Phase 5 y Phase 5.5 están completadas salvo las copias offsite del backup y la confirmación de HTTPS del entorno. Phase 6 y 6.5 (multi-tenancy y Frontend V1) están completadas en su alcance. Phase 7 dispone de roles contextuales, middlewares y seed; Phase 7.6 incluye solicitudes de equipos y logros, asignación directa y paneles admin. Foco de entrega activo: **UI Visual Convergence Workstream**, actualmente en `UI-G0-T04`. Phase 7.5 Auth Hardening permanece pendiente en el roadmap de aprendizaje. Ranking/jugadores requieren el read slice de UI-G1; propuestas de nuevos logros corresponden a Phase 7.7 y también entran en UI-G1.
