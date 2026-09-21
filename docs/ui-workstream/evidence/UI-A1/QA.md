# UI-A1-T03 — QA / Capture, iteración 0

Fecha: 2026-09-20. Alcance: `/login` y `/register` en Windows local, sin cambios de producto, backend, schema, seed ni control plane.

## Resultado

**PASS técnico con límites documentados.** Las cuatro capturas canónicas y los dos smokes intermedios existen, las rutas son funcionales en los tres anchos requeridos y no presentan overflow horizontal. Los flujos ejecutados en navegador, métricas DOM y consola están documentados separadamente en [BROWSER-QA.md](./BROWSER-QA.md); este informe añade preflight, lint, build, TypeScript, health y trazabilidad del runtime.

La aprobación de fidelidad visual corresponde a `visual_critic`; este documento no cierra el gate visual.

## Entorno y preflight

- Modo: Windows local, frontend/backend Node existentes y PostgreSQL aislado en Docker.
- Memoria disponible: **10.507 MiB**; umbral de build: **3.072 MiB** — PASS.
- Listener frontend: `127.0.0.1:3000`, PID **7784**, supervisor **38884**.
- Listener backend: puerto `3001`, PID **33852**, supervisor **41288**.
- PostgreSQL aislado: `weblogros_ui_windows`, `127.0.0.1:55437`, estado **healthy**.
- No se inició, reinició ni detuvo ningún servicio. No se ejecutaron migraciones ni seed.
- Health posterior al build: `/login` 200, `/register` 200 y backend `/health` 200. Los cuatro PID conocidos seguían vivos.

## Evidencia de navegador

El worker QA no tenía superficie IAB disponible (`Browser is not available: iab`). Para respetar la restricción de no usar Chrome, Playwright, CDP ni otro navegador, el Coordinator realizó la captura con `cua_repl`/IAB sobre el mismo runtime. Evidencia reproducible:

- `login-desktop.png`: 1440 × 1024.
- `register-desktop.png`: 1440 × 1024.
- `login-mobile.png`: 390 × 844.
- `register-mobile.png`: 390 × 844.
- `login-tablet.png` y `register-tablet.png`: smoke 768 × 1024.
- `register-error-mobile.png`: mismatch local.
- `login-error-tablet.png`: error real de credenciales.

Resultados principales de [BROWSER-QA.md](./BROWSER-QA.md):

- ancho documento/viewport idéntico en 1440, 768 y 390; sin overflow horizontal;
- inputs de 48 px en desktop y composición responsive estable;
- navegación login ↔ registro PASS;
- `required`, email inválido, toggle mostrar/ocultar y mismatch local PASS;
- credencial incorrecta muestra error del servidor y recupera el botón;
- login real de Ana (PLAYER) y Diego (TEAM_ADMIN) PASS, con redirects y contexto esperados;
- ambas sesiones cerradas; pestaña terminada en `/login` y viewport restaurado;
- sin errores JavaScript observados; un warning preexistente de Next sobre `scroll-behavior: smooth`, fuera del alcance modificado.

## Validaciones de código y build

| Validación | Resultado | Evidencia |
| --- | --- | --- |
| ESLint del alcance (`Header`, componentes auth, login y registro) | PASS | salida limpia, código 0 |
| `npm run lint` | PASS | finalizó sin errores |
| `npx tsc --noEmit` | PASS | salida limpia, código 0 |
| `npm run build` | PASS | compilación 3,3 s; TypeScript 11,3 s; 11/11 páginas; `/login` y `/register` estáticas |
| `git diff --check` del alcance | PASS | código 0; solo avisos locales LF→CRLF |

El primer intento de build falló exclusivamente porque el sandbox no podía descargar seis familias declaradas mediante `next/font`. Se repitió una vez con acceso de red autorizado y completó correctamente. No se borró `.next`, no se tocó `.next/dev` manualmente y el servidor de desarrollo continuó saludable con el mismo PID.

## Matriz funcional y límites

| Criterio | Estado |
| --- | --- |
| Login y registro desktop 1440 × 1024 | PASS |
| Login y registro móvil 390 × 844 | PASS |
| Smoke 768 × 1024 | PASS |
| Overflow horizontal global | PASS |
| Toggle de contraseña y nombre/estado accesible | PASS |
| Validaciones `required` y email inválido | PASS |
| Mismatch de registro sin navegación | PASS |
| Mismatch con cero POST instrumentados | PARCIAL: cero envío sustentado por retorno local del handler; no hubo instrumentación de red |
| Credenciales incorrectas reales | PASS |
| Login fixture Ana / Diego y redirects por rol | PASS |
| Registro exitoso | NO EJERCIDO para no crear una cuenta ni alterar el fixture |
| Carrera de doble submit | NO EJERCIDA en runtime; bloqueo síncrono verificado estructuralmente |
| Error 500 / caída de red | NO EJERCIDO; fuera del smoke solicitado |

No se creó ninguna cuenta y no se modificaron registros del fixture. No se guardaron contraseñas, tokens ni secretos en esta evidencia.

## Servicios al terminar

El runtime recibido queda intacto y saludable para la crítica visual:

- frontend: `http://localhost:3000/login`, PID 7784 / supervisor 38884;
- backend: `http://localhost:3001`, PID 33852 / supervisor 41288;
- base aislada: `weblogros_ui_windows` en `127.0.0.1:55437`.

No se inició ningún proceso propio que requiera limpieza.
