# LockerBoard Visual System

Fuente: extracción de las 16 referencias canónicas de `docs/ui-reference/manifest.json`.

Este documento fija el lenguaje visual común del workstream. Las medidas son bases aproximadas normalizadas al viewport de validación de 1440 × 1024; no son una invitación a escalar la interfaz completa. Las referencias mezclan 1536 × 1024 y 1672 × 941, por lo que una página puede necesitar scroll vertical a 1440.

Las imágenes mandan sobre composición y estilo. `Architecture.md`, `Roadmap.md` y `Decisions` mandan sobre rutas, permisos, estados y comportamiento. Cuando una referencia contradice el contrato funcional, se conserva su geometría y se corrige su semántica.

## Dirección visual

- Interfaz deportiva oscura, gráfica y compacta: negro azulado, superficies petróleo, rojo intenso y tipografía condensada.
- Jerarquía mediante tamaño, contraste, borde y ritmo; sombras y transparencias son secundarias.
- Densidad alta en tablas y paneles administrativos, sin convertir cada fila en una tarjeta independiente.
- Un único acento rojo para navegación y acciones primarias. Verde, ámbar y rojo se reservan a estados; azul puede representar visualmente revisión pendiente sin crear otro estado de dominio.
- Las zonas de fotografía, banners, avatares e imágenes de logros conservan geometría con placeholders. Su contenido pictórico queda fuera de evaluación, no su tamaño, alineación, borde o contraste.

## Tokens base

Los valores son rangos visuales que UI-G2 debe centralizar y ajustar con contraste comprobado.

| Token | Base visual |
| --- | --- |
| fondo profundo | `#00090d`–`#061116` |
| superficie base | `#031116`–`#0b1b22` |
| superficie elevada | un paso más claro que la base; alternancia de filas muy tenue |
| borde | 1 px `#203139`–`#31434a` |
| texto principal | blanco cálido cercano a `#f5f3ed` |
| texto secundario | gris frío cercano a `#bcc6cd` |
| texto terciario | gris azulado cercano a `#899aa5` |
| acento | rojo `#ed0014`–`#ff1420` |
| aprobado | verde accesible sobre fondo verde oscuro translúcido |
| pendiente | ámbar accesible sobre fondo ámbar oscuro translúcido |
| rechazado | rojo claro sobre fondo rojo oscuro translúcido |

No usar fondo negro puro, grises claros, glow global, glassmorphism dominante ni sombras genéricas fuertes. Separar niveles con superficie, borde e inset highlight muy sutil.

## Tipografía

- Titulares: sans condensada, fuerte, normalmente en mayúsculas. Si no existe coincidencia exacta, elegir una única familia de display y conservarla en todo el shell.
- Cuerpo y controles: sans estrecha y legible; sin serif.
- Números de tablas y KPI con cifras tabulares.
- Título de página: 36–46 px, peso 700–900, `line-height` aproximado 1.05.
- Identidad de equipo: 32–40 px.
- Título de sección: 18–22 px.
- Título de tarjeta/fila destacada: 16–20 px.
- Cuerpo: 14–16 px; nunca reducir información esencial por debajo de 14 px.
- Metadatos y encabezados de tabla: 12–14 px con contraste suficiente.
- KPI: 26–34 px.
- El título de detalle puede ser menos condensado, pero debe conservar la misma escala jerárquica.

## Espaciado y geometría

- Escala base: 4, 8, 12, 16, 24 y 32 px.
- Gaps entre paneles: 10–16 px.
- Padding de panel: 12–20 px.
- Gutter principal a 1440: 20–28 px.
- Contenido fluido: aproximadamente 1220–1250 px disponibles después del sidebar, sin contenedor centrado estrecho.
- Paneles: radio 7–10 px.
- Controles: radio 5–8 px.
- Badges/status: radio 4–6 px. Evitar píldoras salvo filtros que la referencia trata como tales.
- Inputs y botones: 36–42 px de alto en desktop; objetivos táctiles cercanos a 44 px en móvil.
- Filas de tabla: 40–52 px según la cantidad de contenido.

## Shell del equipo

### Sidebar

- Ancho original recurrente: 170–185 px; base a 1440: 160–176 px.
- Altura completa, fondo profundo y borde derecho de 1 px.
- Marca centrada arriba dentro de unos 120–140 px de alto.
- Navegación a partir de unos 150–165 px; filas de 40–44 px, gap de 4–8 px, icono de 18–24 px y texto en una línea.
- Estado activo: rojo sólido, texto blanco, radio 6–8 px.
- Orden del workstream: Dashboard, Logros, Ranking, Jugadores y Solicitudes. Administración aparece en un bloque separado solo cuando el rol contextual lo permite.
- Comunidad puede conservarse como información de referencia, pero está fuera de alcance y no debe cablearse como trabajo de este workstream.
- Zona inferior: equipo actual en una caja compacta; después utilidades existentes y cerrar sesión. No crear Ajustes porque exista un icono en los mockups.

### Encabezado tenant

- Identidad del equipo a la izquierda; sesión a la derecha con avatar placeholder circular de 36–44 px, nombre, rol y chevron.
- Franja visual de 120–180 px según la página. Mientras los banners estén fuera de alcance, usar placeholder oscuro que mantenga el espacio y el contraste.
- Temporada y campana son ideas visuales sin contrato funcional. No crear controles activos ni notificaciones. Al omitirlos, conservar el equilibrio y la alineación de la cabecera.
- El contenido comienza inmediatamente bajo identidad/título. No añadir una segunda cabecera SaaS.
- Breadcrumbs compactos de 12–14 px en formularios y detalles.
- Administración debe permanecer activa y aparecer en el breadcrumb de todas sus subrutas.

### Variantes de rol

- PLAYER: ve navegación de lectura, solicitudes propias y CTA `Proponer logro`; no accede a Administración ni creación directa.
- TEAM_ADMIN: conserva navegación común y añade Administración; ve creación directa, asignación y revisión en las rutas aprobadas.
- SUPER_ADMIN no crea una tercera variante tenant salvo que la arquitectura lo exija; su administración global sigue separada.
- El ancho y la geometría del shell no cambian entre PLAYER y TEAM_ADMIN.

## Patrones compartidos

### Headers y KPI

- `PageHeader`: título y descripción a la izquierda; acciones aprobadas a la derecha. La tira KPI va debajo.
- `SectionHeader`: título condensado, icono opcional, enlace rojo pequeño a la derecha y divisor tenue.
- KPI strip: 3–6 celdas; icono de 28–36 px dentro de marco de 48–60 px; número y etiqueta alineados a su derecha.
- Comparaciones temporales solo si el read slice las respalda.

### Tablas y toolbars

- Un único panel con cabecera oscura; títulos de columna de 12–13 px y filas de 40–52 px.
- Identidad a la izquierda con avatar/miniatura; cifras alineadas por columna; acciones a la derecha.
- Toolbar de 36–42 px: búsqueda, filtros y orden en una fila. Secundarios oscuros con borde; CTA principal rojo.
- En móvil, permitir scroll horizontal interno o una representación semánticamente equivalente; nunca overflow global.

### Botones, estados y formularios

- Primario: rojo y texto blanco. Aprobar: verde. Rechazar: rojo. Secundario: superficie oscura con borde tenue.
- No rellenar de rojo todas las acciones secundarias.
- Estado siempre con texto, icono y color: Pendiente, Aprobada o Rechazada.
- `En revisión` es una variante visual de PENDING hasta decisión distinta.
- Propuesta aprobada debe mostrar `Añadida al catálogo`; nunca equivale a logro obtenido.
- Labels encima; input 36–42 px; textarea 76–100 px; helper debajo; contador a la derecha cuando aporte valor.
- Criterios como lista numerada de filas, no como editor complejo.

### Detalles

- Contenido principal a la izquierda y rail de 26–32% a la derecha.
- El rail reúne estado, preview y resolución; el cuerpo usa secciones apiladas con icono/título y criterios numerados.
- Para PLAYER, el rail es de solo lectura. Para TEAM_ADMIN, contiene únicamente acciones respaldadas por contrato.
- Rechazar exige motivo.

## Placeholders de media

| Contexto | Geometría |
| --- | --- |
| avatar de tabla | círculo 1:1, 28–36 px |
| avatar de sesión | círculo 1:1, 40–48 px |
| identidad/perfil | círculo 1:1, 72–96 px |
| podio | círculo 1:1, 90–120 px |
| catálogo y preview | 16:9, ancho completo |
| miniatura de tabla | 1:1, 36–48 px |
| historial personal | horizontal cercano a 2:1 |
| detalle de obtención | marco vertical cercano a 0.9:1 |
| banner tenant | muy panorámico, aproximadamente 7:1–10:1 |
| banner inferior | 3:1–5:1 según página |

Los placeholders decorativos son `aria-hidden`. El nombre accesible del usuario/logro debe existir fuera de la imagen.

## Bases de layout por pantalla

### Dashboard

- Banda superior aproximada 38/33/29%: módulo dominante, estadísticas y actividad.
- Segunda banda: últimos logros ~38%, módulo medio ~27%, top 3 ~35%.
- Progreso, retos, temporada y objetivos son ideas futuras. UI-G1 debe decidir qué stats/feed aprobados ocupan esas zonas; no copiar gráficos falsos.

### Catálogo y formulario

- Catálogo: título/resumen, filtros horizontales y búsqueda; grid de 6 columnas si cada card mantiene al menos ~178 px. Un ajuste a 5 columnas debe justificarse por legibilidad a 1440.
- Card: media 16:9 arriba; título/descripcion; puntos y categoría abajo.
- Formulario PLAYER: cuerpo ~69% y preview/ayuda ~29%; dentro del cuerpo, texto/criterios ~59% y metadatos ~39%; notice ámbar arriba y acciones abajo.
- PLAYER propone; TEAM_ADMIN crea directamente. Solo campos aprobados por el contrato de UI-G1.

### Ranking

- Dos columnas ~61/39.
- Izquierda: podio 2–1–3, ganador 15–20% más alto; tabla y tira de actividad.
- Derecha: estadísticas reales. Evolución semanal y rachas no se implementan sin read slice aprobado.

### Jugadores

- Dos columnas ~40/60: identidad propia y administración del equipo a la izquierda; tabla de miembros a la derecha.
- Resumen numérico arriba; búsqueda y filtros encima de la tabla.
- Banner inferior puede mantenerse como placeholder geométrico.

### Solicitudes y propuestas personales

- Principal ~78% y rail ~21%.
- KPI arriba; tabs/selector, búsqueda y dos tablas apiladas.
- Obtención usa acento frío/cian y propuestas ámbar para distinguir flujos sin cambiar el sistema general.
- La referencia de detalle personal de obtención es en realidad una composición administrativa: reutilizar solo geometría de datos, logro y criterios. Para PLAYER, activar Solicitudes y usar rail de estado/resolución de solo lectura; nunca aprobar/rechazar.
- Detalle de propuesta propia: izquierda ~68%, rail ~31%. Excluir edición de una propuesta aprobada, adjuntos e historial no respaldado.

### Administración del equipo

- Resumen: KPI strip de 6; cinco paneles operativos principales; banda inferior de accesos/ayuda/actividad. Permitir altura natural a 1440.
- Invitaciones: principal/rail ~75/25; formulario y resultado arriba, lista debajo; consejos/actividad en rail.
- Jugadores admin: principal/rail ~79/20; KPI4, toolbar, tabla y paginación; solo roles existentes.
- Logros admin: principal/rail ~75/25; KPI4, toolbar y tabla; asignación rápida arriba del rail.
- Solicitudes admin: KPI5; tabs enlazadas a URLs propias; principal/rail ~76/23; cola y resúmenes.
- Propuestas admin: misma familia; principal ~78%, rail ~21%; aprobar incorpora al catálogo.
- Detalle de solicitud admin: izquierda ~74%, resolución ~25%; contexto/historial solo cuando existan datos.
- Detalle de propuesta admin: principal ~67%, rail ~32%; corregir navegación dibujada en Logros a Administración.

## Inconsistencias resueltas

1. Prevalecen catálogo v2, solicitudes personales/admin v3 y resumen admin v2.
2. `Culipardisk` es contenido ilustrativo; el fixture acordado es Halcones. Identidad y datos vienen del backend.
3. Un PLAYER no recibe `Crear logro` ni `Administración` aunque aparezcan en una imagen.
4. La imagen del detalle personal de obtención es administrativa: adaptación read-only obligatoria.
5. El detalle admin de propuesta debe activar Administración, no Logros.
6. Conteos, puntos, nombres y categorías divergentes se sustituyen por un fixture único; no se hardcodean para imitar el bitmap.
7. No se crean controles público/privado: los equipos son privados por membresía según la decisión vigente.
8. En propuestas internas se habla de miembros del equipo, no de comunidad cross-team.

## Ideas visuales fuera de alcance

No convertir en features: temporadas, retos, progreso parcial, niveles, rachas, evolución semanal, comparaciones temporales sin datos, calendario, archivos/evidencias/enlaces/comentarios, notificaciones, edición de propuesta aprobada, solicitar/sugerir cambios, un cuarto estado `En revisión`, roles configurables, invitación por email, comunidad cross-team, ajustes nuevos, dashboard personalizable ni rutas/perfiles nuevos.

Tampoco integrar imágenes reales de logros, avatares, banners, fotografía, uploads o storage.

## Responsive y accesibilidad

- No hay referencia móvil; la adaptación es una inferencia documentada.
- Sidebar colapsable con navegación accesible; grids reducen columnas progresivamente; main/rail se apilan; formularios pasan a una columna.
- Acciones deben permanecer cerca del contenido que modifican.
- Sin overflow global; tablas pueden tener scroll interno.
- Foco visible, labels reales, landmarks, jerarquía de headings y tablas semánticas.
- Iconos con nombre accesible; estados nunca dependen solo del color.
- Evitar texto rojo pequeño para información imprescindible; usar blanco o un rojo aclarado con contraste verificado.
- Loading, error, empty, 401, 403 y 404 reutilizan shell y superficies comunes; no requieren nuevas referencias.

## Criterio para UI-G2

UI-G2 debe convertir estas bases en tokens y componentes compartidos sin reinterpretar el estilo. El shell queda congelado solo después de captura determinista y revisión por un crítico distinto del implementador. Toda excepción local posterior vuelve al Coordinator.
