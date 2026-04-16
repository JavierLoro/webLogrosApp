# Sesión: MemPalace Setup — 2026-04-14

## Contexto
Proyecto: webLogrosApp (plataforma de logros de equipo, proyecto de aprendizaje progresivo)
Rama: experimentosIniciales

---

## Conversación

**Usuario:** init mempalace

**Asistente:** Ejecuté `mempalace instructions init` y seguí los pasos:
- Python 3.14.3 confirmado
- mempalace v3.2.0 ya instalado vía pip
- `mempalace` no está en PATH — solución: usar `python -m mempalace`
- Error UnicodeEncodeError (cp1252) — solución: prefijo `PYTHONUTF8=1`
- Palace inicializado en `C:\Users\javie\Proyectos\webLogrosApp`
- MCP server registrado: `claude mcp add mempalace -- python -m mempalace.mcp_server`
- Status: 901 drawers, wing `weblogrosapp`, 5 rooms

**Decisión:** Usar siempre `PYTHONUTF8=1 python -m mempalace <cmd>` en este entorno Windows.

---

**Usuario:** mempalace:mine — auto classification, both (project + conversations)

**Asistente:** Minado del proyecto completado:
- 42 archivos procesados
- 200 drawers creados
- Rooms: apps (23), backend (9), documentation (6), general (2), frontend (1), configuration (1)

Comando usado: `PYTHONUTF8=1 python -m mempalace mine "C:\Users\javie\Proyectos\webLogrosApp" --extract general`

**Decisión:** Crear directorio `conversations/` para futuras exportaciones de conversaciones en formato .md.

---

## Decisiones tomadas esta sesión

1. MemPalace inicializado en el directorio del proyecto (no en home)
2. Workaround Windows: `PYTHONUTF8=1 python -m mempalace` en lugar del binario directo
3. MCP server activo para este proyecto
4. Directorio `conversations/` creado para exportar sesiones futuras en .md

## Stack del proyecto al momento de esta sesión

- Backend: Express 5 + TypeScript + Prisma + PostgreSQL (Docker)
- Frontend: Next.js 16 + React 19 + Tailwind CSS 4
- Infra: Nginx reverse proxy, Docker Compose
- Auth: JWT (7d expiración), bcryptjs
- Estado roadmap: Fases 1–5 parcial. Pendiente: Fase 6 (relaciones Prisma, UserLogro, roles)
