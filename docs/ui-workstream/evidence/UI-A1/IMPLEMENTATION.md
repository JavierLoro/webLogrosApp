# UI-A1 — Evidencia de implementación

## Resultado

Se implementó el patrón reusable de acceso público para `/login` y `/register` a partir de los paneles 1 y 2 de la referencia canónica. El cambio usa Tailwind y los tokens `--lb-*` existentes; no añade CSS global, CSS Modules, paquetes, fotografía ni assets nuevos.

Por override explícito del usuario, la proporción contenida de la lámina se traduce finalmente a una composición full-bleed 50/50. No existe tarjeta exterior; cada mitad cubre el alto del viewport en desktop y limita únicamente su contenido interior para mantener legibilidad.

## Archivos

- `apps/frontend/src/app/components/auth/AuthLayout.tsx`
  - Layout 50/50 agnóstico al negocio.
  - Acepta contenido principal, título/copy lateral, footer y asociación accesible del título.
  - Placeholder lateral geométrico CSS y logo existente.
  - Dos columnas a 768/1440; composición apilada a 390.
- `apps/frontend/src/app/components/auth/AuthFields.tsx`
  - `AuthFormHeader`, `AuthField`, `PasswordField`, `AuthError` y `AuthSubmitButton`.
  - Mostrar/ocultar usa texto accesible en vez de añadir un icono nuevo.
  - Las familias tipográficas usan la propiedad explícita `[font-family:...]` para evitar que Tailwind interprete las variables como `font-weight`.
- `apps/frontend/src/app/login/page.tsx`
  - Conserva POST, persistencia local, evento de sesión y redirects existentes.
  - CTA `Entrar`, estado ocupado, errores persistentes y bloqueo de doble envío.
- `apps/frontend/src/app/register/page.tsx`
  - Conserva el POST `{ email, password }` y el redirect actual.
  - Añade confirmación local de contraseña sin enviarla al backend.
  - CTA `Crear cuenta`, estado ocupado, errores persistentes y bloqueo de doble envío.
- `apps/frontend/src/app/components/Header.tsx`
  - Oculta el header público exclusivamente en `/login` y `/register`; conserva la exclusión tenant existente.

## Exclusiones preservadas

No se añadieron nombre, OAuth, recordar sesión, recuperación, enlaces legales, Auth Hardening ni cambios backend. La fotografía de la referencia permanece excluida; solo se conserva su geometría mediante textura y formas CSS.

## Validaciones

- `npm run lint`: PASS.
- TypeScript acotado a auth/Header y dependencias directas: PASS.
- TypeScript completo: no concluyente por tipos `.next` preexistentes que referencian dos rutas eliminadas (`solicitudes/[id]` y `solicitudes/propuestas/[id]`). No se borró `.next` porque el servidor de desarrollo está activo.
- Checks estáticos de contratos POST, payload de registro, sesión/redirect, confirmación local, doble envío, accesibilidad del toggle, contrato reusable, proporción, exclusión exacta del Header y ausencia de CSS Modules: PASS.
- `git diff --check` sobre el alcance: PASS.
- Build: no ejecutado para no competir con el servidor de desarrollo activo, según el contrato de la tarea.

## Handoff a QA y crítica

Pendiente de validación independiente:

- `/login` y `/register` a 1440 × 1024 y 390 px;
- smoke a 768 px;
- overflow horizontal, foco, toggle, mismatch de confirmación, error del servidor y doble envío;
- fidelidad de proporción, jerarquía, separación 50/50 y peso del placeholder lateral.

Esta evidencia no supone aprobación visual.

## Iteración visual 1

- El mensaje lateral deja de anclarse al borde inferior: usa un offset superior común en desktop (`md:mt-24`, `lg:mt-28`) y reserva la zona baja para el placeholder decorativo.
- El título del formulario se compacta a 28–32 px y peso 700. Esto permite que **Bienvenido de nuevo** ocupe una línea a 1440 px sin imponer `nowrap`; en viewports estrechos conserva wrapping natural.
- No se modificaron comportamiento, payloads, controles, tokens, media ni rutas.

## Iteración visual 2 — full-bleed

- Se eliminan `max-width`, padding exterior, borde, radio y sombra del frame.
- Aside y formulario ocupan columnas 50/50 y `min-height: 100dvh` desde desktop.
- El formulario mantiene un ancho interno máximo de 27 rem; los inputs no se estiran hasta llenar toda la media pantalla.
- En móvil las superficies se apilan a ancho completo, con lateral compacto y alturas naturales sin `overflow: hidden` vertical.
- Este cambio reemplaza las capturas de la iteración anterior y requiere una nueva validación independiente.
