# UI-G2-T05 — Visual Critic — Iteración 1

## Evidencia

- `player-shell-iteration-1-1440x900.png` — SHA-256 `649809EE90FB5DEAE98051B38C4A7060D6B2FC3FCB7DF729D31B89898339147B`.
- `team-admin-shell-iteration-1-1440x900.png` — SHA-256 `32A4A1BA67884A3354B6CE72BEFD41B67721F9FC53C987ADAACD2143B5965053`.
- Ambas capturas verificadas completas con detalle original a `1440 × 900`.
- Comparación limitada al shell; se ignora el cuerpo provisional del dashboard.

## Revisión de deltas anteriores

### Resuelto — cabecera tenant

La franja compartida mide aproximadamente 129 px, entra en el rango documentado de 120–180 px y conserva una composición equilibrada: identidad a la izquierda, placeholder panorámico oscuro y sesión a la derecha. PLAYER y TEAM_ADMIN usan la misma geometría.

### Resuelto — lockup LockerBoard

La marca adopta una composición vertical, queda contenida dentro de los 172 px y mantiene padding lateral. Ya no invade ni colisiona con la identidad tenant.

### Resuelto — nombre del equipo actual

`Halcones` aparece completo en ambas capturas. Icono, texto y chevron caben dentro de la tarjeta sin desbordar.

### P2 residual — peso de navegación

Los labels inactivos siguen siendo algo más ligeros y menos condensados que en las referencias, pero el contraste, el estado activo y la densidad de fila son claros. Es un ajuste micro y no bloquea por sí solo el gate.

## Deltas actuales

### P1 — Administración está mezclada con utilidades inferiores

- **Elemento:** jerarquía de navegación TEAM_ADMIN.
- **Referencia:** dashboard y todas las pantallas administrativas colocan `Administración` en un bloque de navegación separado inmediatamente después del grupo común y antes de `Equipo actual`. `VISUAL_SYSTEM.md` fija la misma relación.
- **Implementación observada:** `Administración` aparece casi al pie del sidebar, después de la tarjeta `Equipo actual` y de `Cambiar equipo`, justo antes de `Cerrar sesión`.
- **Diferencia:** una ruta primaria de trabajo queda visualmente clasificada como utilidad de cuenta/equipo; además, se aleja del resto de destinos y puede caer antes fuera del viewport en alturas menores.
- **Corrección esperada:** mover `Administración` a un grupo propio debajo de `Solicitudes`, separado por un divisor/espaciado corto, y mantener `Equipo actual`, `Cambiar equipo` y `Cerrar sesión` en la zona inferior. No cambiar el ancho, los gutters ni la geometría compartida; en rutas admin el estado activo debe usar la misma superficie roja que el resto de navegación.

## Comprobaciones de regresión

- Sin P0 observable.
- Sidebar de 172 px estable en ambos roles.
- Cabecera de 129 px y alineaciones idénticas entre PLAYER y TEAM_ADMIN.
- PLAYER no muestra Administración; TEAM_ADMIN sí la muestra.
- Marca, identidad tenant, sesión, navegación común y contenido permanecen visibles en ambos roles.
- Gutter izquierdo, ancho de contenido, superficies y divisores no cambian por rol.
- No se aprecia overflow horizontal; el scrollbar vertical corresponde a contenido de altura natural.
- No se integraron banners, avatares ni media reales.

## Gate

La iteración elimina los P1 de cabecera, lockup y truncado, pero el orden del destino Administración sigue siendo una diferencia material del shell y debe corregirse antes de congelarlo.

VERDICT: ITERATE
