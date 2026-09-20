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

## Entrega verificada — 2026-09-20

- PR #8 integrada: `b34ba8a`; checkpoint UI `842f67a`. La carpeta principal se actualizó mediante fast-forward. Respaldo `f98e18a` publicado también en origin.
- Windows: Node 24.14.0, npm 11.9.0; preflight 13.6 GiB libres, puertos 3000/3001/55437 inicialmente libres y sin contenedores activos. No se modificaron contenedores anteriores.
- `npm ci` backend/frontend PASS; Prisma Client 7.5.0 generado; 13 migraciones aplicadas a la base nueva vacía. Seed ejecutado una vez satisfactoriamente: 2 equipos, 19 logros, 13 usuarios, 42 concesiones, 8 solicitudes, 6 invitaciones y 6 propuestas globales.
- Configuración creada solo localmente en `apps/backend/.env.ui-windows`, ignorada por Git. El `.env` previo permanece intacto. Contraseña de los usuarios visuales en SEED_USER_PASSWORD de ese archivo local; no publicarla ni imprimir secretos/tokens en logs.
- PostgreSQL `weblogros_ui_windows` healthy. `GET http://localhost:3000/login` 200. Login de Ana/PLAYER y Diego/TEAM_ADMIN mediante proxy local PASS; contexto, ranking y jugadores PASS para ambos: 12/14/40/4280 y 12 filas.
- Frontend `npm run lint` PASS. No se repitió build de producción Windows: se comprobó arranque de desarrollo. No se han ejecutado captura ni aprobación de G6.
- npm audit durante instalación informó backend 20 vulnerabilidades (1 low, 6 moderate, 13 high) y frontend 11 (1 low, 2 moderate, 7 high, 1 critical). No se ejecutó audit fix ni se cambiaron versiones; evaluación/remediación fuera de esta entrega.
- Procesos iniciados: backend supervisor 41288, listener 33852; frontend supervisor 38884, listener 7784. Son identificadores históricos: verificar CommandLine, relación padre/hijo y puerto antes de cualquier parada. Logs locales ignorados: `.env.ui-windows-stdout.log` y `.env.ui-windows-stderr.log` en cada app. Para detener, cerrar únicamente los árboles verificados de esos supervisores; no detener todos los procesos Node ni borrar el volumen Docker.

### Reiniciar cuando no haya servidores activos

Tras repetir el preflight, reutilizar `docker start weblogros_ui_windows` si el contenedor está detenido. No ejecutar run de nuevo ni volver a sembrar por rutina.

Backend, desde `apps/backend`, en una terminal PowerShell:

```powershell
$env:Path = "$PWD\node_modules\.bin;$env:Path"
node --env-file=.env.ui-windows node_modules/nodemon/bin/nodemon.js --exec ts-node src/server.ts
```

Frontend, desde `apps/frontend`, en otra terminal:

```powershell
npm run dev -- --hostname 127.0.0.1
```

Solo si se inicializa otra base aislada vacía, después de comprobar su destino:

```powershell
# Desde apps/backend; el PATH local permite resolver ts-node en el seed de Prisma.
$env:Path = "$PWD\node_modules\.bin;$env:Path"
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.ui-windows node_modules/prisma/build/index.js db seed
```
