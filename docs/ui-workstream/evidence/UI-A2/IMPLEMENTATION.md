# UI-A2 — Evidencia de implementación

## Resultado

Se trasladaron los paneles 3–6 de la referencia a las rutas reales `/equipos`, `/unirse` y `/solicitar-acceso`. La implementación usa exclusivamente contratos existentes y mantiene estados explícitos sin datos de dominio inventados.

## Archivos

- `apps/frontend/src/app/equipos/page.tsx`
  - Una lectura autenticada de `GET /api/equipos/mis-equipos`.
  - Estados loading, error/retry, empty y populated sin parpadeo de empty inicial.
- `apps/frontend/src/app/components/onboarding/TeamsOverview.tsx`
  - Cards derivadas de `TeamSummary`, join card y panel inferior de solicitud.
  - Sin peticiones por card; métricas ausentes indicadas como **Estadísticas no disponibles**.
- `apps/frontend/src/app/components/onboarding/OnboardingHeader.tsx`
  - Marca y acciones reales según sesión: Admin contextual global, Mis equipos/Unirse y cierre de sesión.
  - No representa nombre, avatar ni dropdown ficticios.
- `apps/frontend/src/app/unirse/page.tsx`
  - Preview real y POST de unión preservados.
  - AbortController + secuencia de petición evitan previews antiguos; el token visible debe coincidir con el que originó el preview antes de unir.
  - Refs de exclusión mutua bloquean comprobaciones y uniones duplicadas.
- `apps/frontend/src/app/solicitar-acceso/page.tsx`
  - Payload `{ teamName, officialEmail, message }`, límites y errores existentes preservados.
  - Estado de éxito únicamente después de un POST satisfactorio.
  - Copy de éxito limitada a recepción y revisión pendiente, sin email, plazo ni aprobación prometidos.
- `apps/frontend/src/app/components/auth/AuthLayout.tsx`
  - Extensión compatible: acciones de sesión y `asidePosition="right"`.
  - Defaults de A1 preservados y lateral aún oculto por debajo de 768 px.
- `apps/frontend/src/app/components/auth/AuthFields.tsx`
  - Nuevo `AuthTextArea` con la misma semántica/tokens de los campos existentes.
- `apps/frontend/src/app/components/Header.tsx`
  - Exclusión exacta añadida para `/equipos`, `/unirse` y `/solicitar-acceso`; cada ruta contiene marca y acciones propias.

## Datos y gaps

- No se añadieron temporadas, tipos de equipo, descripciones, contadores, usuario ficticio ni ceros sustitutos.
- No se implementó backend ni se inventaron endpoints.
- Las decisiones/gaps futuros están separados en `BACKEND-GAPS.md`.
- No se consumieron invitaciones ni se crearon solicitudes durante la validación local de implementación.

## Validaciones

- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- Checks estáticos: petición única de equipos, ausencia de N queries, estados, contratos de preview/join/solicitud, protección anti-stale, doble envío, éxito posterior al POST, ausencia de promesas no soportadas, defaults de AuthLayout y exclusiones del Header: PASS.
- `git diff --check` del alcance: PASS.
- Build y pruebas runtime mutantes: delegados a QA para no competir con el servidor activo ni crear registros sin estrategia de reversión.

## Handoff a QA/crítica

- Capturar `/equipos` populated y móvil; probar error/empty mediante interceptación no mutante.
- En `/unirse`, validar preview y errores sin consumir la invitación salvo autorización/reversión explícita; comprobar que cambiar el token invalida el preview anterior.
- En `/solicitar-acceso`, validar campos/errores sin enviar por rutina. El éxito requiere POST real y no debe forzarse mediante una ruta o mock de producto.
- Ejecutar regresión de login/register porque `AuthLayout` y `AuthFields` son compartidos.

Esta entrega no constituye aprobación visual.
