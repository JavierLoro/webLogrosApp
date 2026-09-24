# Frontend 7.8 — perfil y alias

Fecha: 2026-09-24. Implementación funcional; revisión visual final corresponde al Coordinator.

## Entrega

- Nueva ruta global `/perfil`: datos personales, correo de consulta y alias separados por equipo.
- GET/PATCH `/api/auth/profile`; PATCH `/api/equipos/:slug/mi-alias` usando contrato acordado con backend.
- Cada formulario conserva su propio borrador, error y estado de guardado; el guardado global no sustituye membresías ni borra un alias que se esté editando.
- Alias vacío se envía como null. Vista previa usa alias o nombre global guardado; los nombres no completados se señalan sin inventar una identidad.
- Formularios bloqueados solo durante su petición y cerrojo useRef contra doble envío. Error conserva el borrador, permite reintento; 401 enlaza al login.
- Carga, error inicial/reintento y lista de equipos vacía. Labels explícitas, autocomplete de nombres, regiones status/alert, foco visible, layout de una columna móvil.
- Entrada Mi perfil desde acciones de cuenta y navegación de equipo, también móvil. Header global excluye /perfil para evitar duplicación de cabeceras. Al salir del tenant se desmonta TeamShell; regreso obtiene contexto actualizado.

## Archivos

- `apps/frontend/src/app/perfil/page.tsx`
- `apps/frontend/src/app/perfil/profile.module.css`
- `apps/frontend/src/app/components/Header.tsx` (solo exclusión ruta)
- `apps/frontend/src/app/components/onboarding/OnboardingHeader.tsx` (enlace y wrap móvil)
- `apps/frontend/src/app/components/team/TeamNavigation.tsx` (enlace de cuenta)

## Referencia y alcance visual

Leídos STATUS, TASKS, PLAN, contrato FRONTEND_WORKER, manifest y skill image-to-code. Inspeccionada referencia canónica `_compartidas/acceso-onboarding-desktop-v1.png`: superficies carbón, contraste blanco/gris, bordes discretos, controles rectangulares y acento rojo. El manifest no contiene mockup específico de /perfil; la extensión funcional reutiliza esos tokens y el encabezado de cuenta existente según alcance explícito del Coordinator. No se generan reemplazos de referencias, assets, avatares, uploads ni cambios de tokens/primitivas.

## Verificación

- TypeScript `npx tsc --noEmit`: PASS.
- ESLint dirigido a los cuatro TSX: PASS.
- QA independiente asignada: edición nombres, alias A/B independientes, alias null, aislamiento tenant, navegación actualizada, 401/error/reintento, escritorio/móvil y capturas.
- No se declara gate visual desde implementación. Coordinator debe revisar composición nueva, estados y navegación móvil, incluyendo la cabecera de cuentas SUPER_ADMIN con wrap.
