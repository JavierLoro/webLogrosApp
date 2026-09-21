# UI-A2 — QA no visual de frontend, iteración 0

Fecha: 2026-09-21. Alcance: validación independiente de compilación, runtime y contratos frontend para `/equipos`, `/unirse` y `/solicitar-acceso`, incluida la regresión compilada de los componentes compartidos con `/login` y `/register`.

## Resultado

**PASS técnico en el alcance no visual.** No se detectaron defectos de contrato frontend en los checks dirigidos. La captura, las métricas DOM y los flujos reales de navegador corresponden al Coordinator porque la superficie IAB no está disponible en este worker. Este informe no declara el gate visual.

## Entorno y preflight

- Modo: Windows local; frontend/backend Node ya existentes y PostgreSQL aislado en Docker.
- Memoria disponible antes del build: **10.139 MiB**; umbral: **3.072 MiB** — PASS.
- Frontend: `127.0.0.1:3000`, PID **7784**, supervisor **38884**.
- Backend: puerto `3001`, PID **33852**, supervisor **41288**.
- Base aislada: contenedor `weblogros_ui_windows`, `127.0.0.1:55437`, estado **healthy**.
- No se inició, reinició ni detuvo ningún servicio. No se ejecutaron seed, migraciones ni peticiones POST.

## Validaciones ejecutadas

| Validación | Resultado | Evidencia |
| --- | --- | --- |
| `npm run lint` | PASS | salida limpia |
| `npx tsc --noEmit` | PASS | código 0, salida limpia |
| `npm run build` | PASS | compilación 3,5 s; TypeScript 3,3 s; 11/11 páginas |
| `git diff --check` del alcance frontend | PASS | código 0; solo avisos locales LF→CRLF |
| GET `/equipos` | PASS | HTTP 200 |
| GET `/unirse` | PASS | HTTP 200 |
| GET `/solicitar-acceso` | PASS | HTTP 200 |
| Regresión GET `/login` y `/register` | PASS | HTTP 200 en ambas |
| Health backend posterior | PASS | `/health` 200; PID originales vivos |

El primer intento de build falló únicamente porque el sandbox bloqueó las descargas de seis familias ya declaradas con `next/font`. Se repitió una vez con acceso de red autorizado y terminó correctamente. No se borró `.next`, no se manipuló `.next/dev` y el servidor de desarrollo siguió saludable con el mismo PID.

## Checks dirigidos de contratos frontend

### `/equipos`

- Exactamente una referencia a `GET /api/equipos/mis-equipos` en la pantalla.
- La lectura usa `AbortController`, propaga `signal` y aborta al desmontar/reintentar.
- Loading, error/retry, empty y populated están diferenciados.
- `TeamsOverview` no contiene endpoints ni peticiones por tarjeta.
- La ausencia de métricas se expresa como **Estadísticas no disponibles**; no hay ceros ni datos de dominio inventados.

### `/unirse`

- Preview preservado en `GET /api/invitaciones/preview?token=...` con token codificado.
- Al cambiar el token se incrementa la secuencia, se aborta la lectura anterior, se limpia preview/error y se libera el estado de comprobación.
- Las respuestas antiguas se descartan mediante `requestId !== previewSequence.current`.
- El join exige que el token limpio coincida con el token que originó el preview visible.
- Payload preservado: `{ token: cleanToken }` a `/api/invitaciones/join`.
- `checkingRef` y `joiningRef` establecen exclusión síncrona antes de esperar la red; el botón también queda deshabilitado durante la operación.
- Errores de token vacío, preview, join y 401 tienen estados locales diferenciados.

### `/solicitar-acceso`

- Payload preservado exactamente como `{ teamName, officialEmail, message }`.
- Restricciones declaradas: nombre 3–80, email hasta 254 y mensaje requerido hasta 1500.
- `savingRef` bloquea doble envío antes de la primera espera; campos y CTA quedan deshabilitados durante el POST.
- El éxito solo se activa después de resolver satisfactoriamente `apiFetch`.
- El copy confirma recepción y revisión pendiente; no promete email, plazo, aprobación ni rol futuro.
- 401 y 409 mantienen mensajes locales específicos; el resto conserva el mensaje de API o fallback.

### Componentes compartidos y Header

- `AuthTextArea` reutiliza la semántica y estilos de los campos A1.
- `AuthLayout` conserva el lateral oculto por debajo de 768 px y añade extensiones compatibles (`actions`, `asidePosition`).
- El Header global se excluye explícitamente en `/equipos`, `/unirse` y `/solicitar-acceso`; sus exclusiones de login/register y tenant permanecen.
- El build y TypeScript incluyen `/login` y `/register`, cubriendo la regresión de compilación de A1 tras extender los componentes compartidos.

## Gaps y límites

`ANALYSIS.md`, `BACKEND-GAPS.md` e `IMPLEMENTATION.md` son coherentes con lo observado: no se añadieron temporadas, tipos/descripciones de equipo, identidad global ficticia, estadísticas inventadas, seguimiento persistente, notificaciones por email ni plazos. No existe un gap que requiera backend para completar este alcance.

No se ejercieron en este worker:

- captura, responsive, overflow, consola o red de navegador;
- preview real de invitación o cambio rápido de token;
- join real, porque consumiría una invitación o modificaría membresías;
- envío real de solicitud o estado de éxito, porque crearía un registro;
- estados interceptados de error/empty/loading;
- carrera de doble click en runtime (la protección se verificó estructuralmente).

Estos puntos deben quedar en la evidencia de navegador del Coordinator y no se consideran probados por este informe.

## Estado al terminar

El runtime recibido queda intacto:

- frontend `http://localhost:3000`, PID 7784 / supervisor 38884;
- backend `http://localhost:3001`, PID 33852 / supervisor 41288;
- PostgreSQL aislado `weblogros_ui_windows` en `127.0.0.1:55437`.

No se creó ningún proceso propio que requiera limpieza y no se alteró el fixture.
