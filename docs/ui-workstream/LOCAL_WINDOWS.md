# Continuación local en Windows

## Punto de entrada

Carpeta: `C:\Users\javie\Proyectos\webLogrosApp`.
Leer AGENTS.md, STATUS.md, TASKS.md y PLAN.md. El workstream sigue PAUSED después de UI-G6-T02; próxima tarea UI-G6-T03, todavía sin captura ni aprobación visual de jugadores. No avanzar el roadmap global. Detener al cerrar UI-G9.

Los cambios anteriores de la carpeta principal se conservan separadamente en la rama `codex/local-backup-before-ui-20260920`, commit `f98e18a`. Incluyen Solicitudes, referencias y documentación: no reintroducirlos automáticamente sobre el nuevo shell. Revisar esa rama cuando corresponda UI-G7; no se han descartado.

## Entorno de pruebas

Usar PostgreSQL Docker aislado y backend/frontend como procesos Windows. No arrancar el compose completo ni usar la base principal. URL prevista: `http://localhost:3000/login`; backend: `http://localhost:3001`.

Antes de iniciar, inventariar Docker, puertos 3000/3001/55437 y procesos propietarios, y comprobar memoria libre (mínimo 2560 MiB para desarrollo, 3072 MiB para build). La skill weblogros-entorno-seguro está escrita para Linux/CT112: aplicar estas comprobaciones equivalentes de PowerShell aquí, sin ejecutar su script remoto. No detener procesos ajenos ni iniciar duplicados.

Base aislada prevista: contenedor `weblogros_ui_windows`, puerto `127.0.0.1:55437`, volumen `weblogros_ui_windows_data`, PostgreSQL 16, base `weblogros_ui`. Configuración local mediante variables de proceso; no sobrescribir archivos .env existentes ni publicar secretos. Aplicar migraciones versionadas con `npx prisma migrate deploy`; ejecutar seed únicamente si falta el fixture. Nunca resetear bases existentes.

Desde apps/backend, definir DATABASE_URL de la base aislada, JWT_SECRET local y SEED_USER_PASSWORD para la inicialización. Usar `npm run seed` con variables de proceso en PowerShell: `seed:dev` utiliza un shell POSIX y no es el punto de entrada Windows. El seed requiere contraseña explícita. Usuarios visuales: `ana@halcones.test` (PLAYER) y `diego@halcones.test` (TEAM_ADMIN). No usar estas credenciales de prueba en producción.

Arrancar backend con `npm run dev` desde apps/backend y frontend con `npm run dev -- --hostname 127.0.0.1` desde apps/frontend, una sola instancia por servicio. Verificar login y lecturas Halcones: 12 miembros, 14 logros, 40 concesiones, 4280 puntos. Registrar PID/rutas y validar su identidad antes de detenerlos. No reutilizar PID históricos sin comprobarlos.

Las capturas posteriores deben usar datos reales del fixture, reloj `2026-09-20T12:00:00Z`, locale es-ES y zona Europe/Madrid. El smoke de arranque no sustituye UI-G6-T03 ni la crítica independiente UI-G6-T04.

CT112 queda fuera de la continuación. Sus servicios históricos no se han apagado por inferencia; no conectarse ni modificarlos para ejecutar tareas locales.
