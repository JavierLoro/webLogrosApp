# UI-A2 — Análisis del resto de acceso y onboarding

## Fuente, alcance y autoridad

- Referencia canónica: `apps/frontend/LockerBoard-marca/ReferenciasPaginas/_compartidas/acceso-onboarding-desktop-v1.png` (1536 × 1024 px).
- Regiones válidas: paneles 3–6 (`/equipos`, `/unirse`, `/solicitar-acceso` y éxito tras el POST).
- Se excluyen los títulos/marcos de la lámina, fotografía, temporadas, tipo de equipo, usuario ficticio, cifras inventadas y cualquier acción sin contrato real.
- Se mantiene el override A1: composición full-viewport y móvil menor de 768 px con logo/formulario, sin lateral decorativo.
- La referencia manda en composición; `Architecture.md`, `Roadmap.md`, `Decisions` y los contratos frontend existentes mandan en comportamiento.

## Lectura medida de la referencia

| Panel | Geometría aproximada | Jerarquía trasladable |
| --- | --- | --- |
| 3. Mis equipos | interior x 1043–1518, y 108–540; ~475 × 432 px | header compacto ~38 px, título/CTA, grid de cuatro columnas, franja inferior de solicitud + placeholder panorámico |
| 4. Invitación | interior x 20–496, y 607–982; ~476 × 375 px; división ~44/56 | lateral visual izquierdo, formulario derecho, una acción principal y ayuda contextual |
| 5. Solicitar equipo | interior x 530–1010, y 607–982; ~480 × 375 px; división ~47/53 | lateral visual izquierdo, formulario derecho, controles apilados y CTA ancho |
| 6. Éxito | interior x 1043–1518, y 607–982; ~475 × 375 px; contenido/lateral ~65/35 | confirmación centrada, explicación breve, pasos honestos y CTA; lateral visual a la derecha |

El sistema visual mantiene fondo negro azulado, superficies elevadas mínimas, bordes fríos finos, marca roja y tipografía condensada en títulos. Los formularios no necesitan cajas anidadas adicionales: la columna derecha es la superficie del formulario.

## Contratos frontend existentes

### Mis equipos

- Una lectura autenticada: `GET /api/equipos/mis-equipos`.
- Respuesta usada: `TeamSummary[]` con `slug`, `nombre`, `role`.
- Estados: loading, error con retry, empty y populated.
- Cada card muestra únicamente nombre, rol contextual y acceso a `/equipos/:slug`.
- Las estadísticas inexistentes se expresan como **Estadísticas no disponibles**, no como ceros ni como fallo de una petición inexistente.
- La cabecera propia conserva marca, enlaces reales y cierre de sesión. No representa nombre/avatar porque el contrato global no los aporta.

### Unirse mediante invitación

- Preview público: `GET /api/invitaciones/preview?token=...`.
- Datos reales: `team.slug`, `team.nombre`, `expiresAt`, `remainingUses`.
- Unión autenticada: `POST /api/invitaciones/join` con `{ token }`; respuesta `{ team: TeamSummary }`.
- Cambiar el token invalida inmediatamente el preview anterior. Cada comprobación cancela/ignora respuestas antiguas; solo puede unirse el token que originó el preview visible.
- Estados diferenciados: inicial, checking, preview válido, error de preview, joining y error de join. Los botones bloquean doble envío.

### Solicitar acceso

- Escritura autenticada: `POST /api/equipos/solicitudes`.
- Payload preservado: `{ teamName, officialEmail, message }`.
- Límites actuales preservados: equipo 3–80, email hasta 254, mensaje requerido hasta 1500.
- Estados: formulario, submitting, error local/API y éxito únicamente tras respuesta satisfactoria.
- El éxito confirma recepción y revisión pendiente. No promete email, plazo, aprobación ni rol futuro.

## Componentes y responsive

- `/equipos` usa una cabecera compacta propia y un contenido de ancho controlado dentro de una superficie full-width, sin el Header global duplicado.
- `/unirse` y `/solicitar-acceso` reutilizan `AuthLayout`/`AuthFields`; se permite textarea reusable y lateral a la derecha para éxito.
- Desktop: `/equipos` usa grid adaptable de cards; formularios usan split full-viewport.
- Móvil <768 px: formulario/logo únicamente en las rutas split. `/equipos` apila header, acciones, cards y panel inferior sin overflow.
- No se incorporan media real, fotografías, avatares ni banners; los bloques visuales son CSS y decorativos.

## Criterio de captura posterior

- `/equipos`: 1440 × 1024 populated, error/empty funcionales y 390 px.
- `/unirse`: 1440 con preview válido, error de preview y 390 px; probar cambio rápido de token.
- `/solicitar-acceso`: 1440 form, éxito real tras POST, error y 390 px.
- Regresión de login/register por extensión de componentes compartidos.
- No considerar aprobada visualmente ninguna pantalla desde esta implementación.
