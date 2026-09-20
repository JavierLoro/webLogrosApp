# UI-G4-T01 — Análisis ejecutable de catálogo y formulario por rol

## 1. Autoridad y alcance

Fuentes visuales inspeccionadas a tamaño original:

- `catalogo-desktop-v2.png`, 1672 × 941: referencia canónica del catálogo.
- `nuevo-logro-desktop-v1.png`, 1672 × 941: referencia canónica del formulario PLAYER.
- panel derecho de `_compartidas/detalle-y-formulario-logro-desktop-v1.png`: apoyo visual para creación directa TEAM_ADMIN.

Autoridad funcional: `Architecture.md`, `Roadmap.md` Phase 7.7/UI-G4, `Decisions`, los contratos terminados en UI-G1 y las rutas Express actuales. `VISUAL_SYSTEM.md` prevalece sobre elementos inconsistentes de los bitmaps.

Esta fase implementa solamente:

- `/equipos/[slug]/logros`: catálogo tenant-scoped;
- `/equipos/[slug]/logros/nuevo`: propuesta PLAYER o creación directa TEAM_ADMIN según la membresía contextual.

No se tocan tokens, `TeamShell`, `TeamNavigation`, `TeamIdentity`, `PageHeader`, `SectionHeader`, `TeamSurface`, `KpiStrip`, `AchievementMedia` ni `PlayerAvatar`. No se incorporan imágenes reales, subida, storage, temporada, secretos, progreso parcial, comunidad ni edición.

## 2. Contratos reales disponibles

### Catálogo

Una única petición autenticada a `GET /api/equipos/:slug/logros` devuelve, en orden `createdAt desc, id desc`:

```ts
type CatalogAchievement = {
  id: number
  createdAt: string
  nombre: string
  puntos: number
  criterios: string[]
  descripcion: string | null
  categoria: string | null
  icono: string | null
  teamId: number
  holdersCount: number
  earnedByMe: boolean
}
```

`types/api.ts` todavía no refleja `createdAt`, `criterios`, `holdersCount` ni `earnedByMe`; T02 debe ampliar el tipo sin cambiar el backend. La lectura ya está protegida por membresía y tenant.

Derivaciones permitidas sobre esa respuesta, sin peticiones adicionales:

- total de logros: `items.length`;
- obtenidos por mí: `earnedByMe === true`;
- concesiones del equipo: suma de `holdersCount`;
- categorías: conjunto de `categoria.trim()` no vacías.

No hay datos de progreso, secretos ni bloqueos. No se deben inferir.

### Escritura por rol

El rol procede exclusivamente de `useTeamContext().me.role`; `isSuperAdmin` global no interviene.

| Rol contextual | Endpoint | Body exacto | Resultado semántico |
| --- | --- | --- | --- |
| PLAYER | `POST /api/equipos/:slug/propuestas` | `{ nombre, descripcion, criterios }` | Crea propuesta `PENDING`; no crea `Logro`, `UserLogro` ni `SolicitudLogro`. |
| TEAM_ADMIN | `POST /api/equipos/:slug/logros` | `{ nombre, puntos, descripcion?, categoria?, criterios }` | Añade directamente un logro al catálogo; no lo concede a nadie. |

Límites del backend que el cliente debe reflejar:

- `nombre`: obligatorio, trim, 1–120;
- propuesta `descripcion`: obligatoria, trim, 1–1000;
- creación directa `descripcion`: opcional; si existe, 1–1000;
- `criterios`: máximo 10, cada entrada trim 1–300; propuesta exige al menos uno, creación directa permite `[]`;
- `puntos`: solo TEAM_ADMIN, entero `>= 0`;
- `categoria`: solo TEAM_ADMIN, opcional, trim 1–80.

El schema de propuestas es `strict`: T03 no puede reutilizar un body común con puntos, categoría, tenant, autor, estado o `logroId`.

## 3. Catálogo — composición de T02

### Geometría desktop

Con el shell congelado, usar el ancho útil completo y `var(--lb-page-gutter)`, no el `max-w-6xl` centrado actual.

1. **Cabecera de página**: comienza inmediatamente bajo la identidad tenant. Título condensado `Logros del equipo`, descripción breve y CTA contextual a la derecha. Puede reutilizar `PageHeader` y una tira compacta de datos reales.
2. **Resumen real**: hasta cuatro celdas — total, obtenidos por mí, concesiones y categorías — sin copiar `Completados / En progreso / Secretos` del bitmap.
3. **Toolbar**: una fila de 40–44 px con categorías derivadas a la izquierda y búsqueda a la derecha. La categoría activa usa el rojo primario; el resto, superficie oscura con borde.
4. **Grid**: comienza a 12–16 px de la toolbar. A 1440 debe mostrar seis columnas siempre que cada card conserve al menos 178 px; usar cinco antes de ese umbral. Gap visual 12–16 px.
5. **Card**: media `AchievementMedia variant="landscape"` 16:9, badge de obtenido solo cuando `earnedByMe`, título de una o dos líneas, descripción de hasta dos líneas y pie con puntos, categoría y `holdersCount`. La card completa enlaza al detalle existente.

Objetivo a 1440: contenido útil aproximado de 1220 px tras sidebar y gutters; seis columnas de ~190–195 px. Evitar alturas artificialmente iguales si causan recorte, pero alinear el pie mediante flex.

### Interacción aprobada

- Búsqueda local, `type="search"`, sobre nombre + descripción + categoría, normalizada sin mutar datos.
- Filtro local por categorías reales y opción `Todos`.
- Conteo visible de resultados y acción para limpiar cuando exista filtro activo.
- Orden del backend preservado; no añadir selector de orden.
- Sin paginación: el endpoint no la soporta y el fixture tiene 14 filas.
- Sin conmutador grid/lista: la variante lista no tiene referencia ni contrato implementado.

CTA y empty state:

- PLAYER: `Proponer logro`;
- TEAM_ADMIN: `Crear logro`;
- ambos apuntan a `/equipos/:slug/logros/nuevo`.

### Datos por región

| Región | Datos reales |
| --- | --- |
| resumen | longitud, suma de holders, `earnedByMe`, categorías únicas |
| filtros | categorías del payload; nunca lista fija del bitmap |
| card | id, nombre, descripción, categoría, puntos, holdersCount, earnedByMe |
| enlace | slug de ruta + id real |
| media | placeholder geométrico basado en nombre; sin URL |

## 4. Formulario — composición de T03

### Geometría común

- Breadcrumb compacto: equipo / Logros / acción actual; enlace `Volver al catálogo` accesible.
- A 1440, grid principal aproximado `69% / 29%`, gap 16–20 px.
- Izquierda: formulario en una superficie; derecha: preview sticky solo cuando haya altura suficiente y ayuda contextual.
- Inputs 40–44 px; textarea 88–104 px; criterios en filas numeradas, cada una con control de eliminación y botón `Añadir criterio`.
- Acciones al final: cancelar secundario y submit rojo. El preview usa `AchievementMedia` 16:9 y conserva el nombre accesible fuera de la media.

### Variante PLAYER

Título `Proponer logro`, notice ámbar a todo el ancho y explicación inequívoca: el equipo revisará la idea y aprobarla solo la incorpora al catálogo.

Distribución interna para reemplazar campos no aprobados sin dejar un hueco ficticio:

- bloque izquierdo (~59%): nombre y descripción;
- bloque derecho (~39%): lista de criterios;
- rail: preview `Propuesta` y pasos reales de revisión.

Campos enviados: nombre, descripción y uno a diez criterios. No mostrar categoría sugerida, puntos sugeridos, temporada, secreto, imagen, evidencia ni “por qué debería existir”. Submit: `Enviar propuesta`.

Tras `201`, navegar a `/equipos/:slug/solicitudes`, ubicación acordada para el historial propio. No afirmar que el logro ya existe ni que fue obtenido.

### Variante TEAM_ADMIN

Título `Crear logro` y texto que indique incorporación directa al catálogo. Sin notice de revisión.

- bloque principal (~59%): nombre, descripción y criterios;
- metadatos (~39%): puntos obligatorios y categoría opcional;
- rail: preview de catálogo y recordatorio de que crear no concede el logro.

No enviar `icono`: existe en persistencia pero no forma parte de `crearLogroSchema`. No mostrar temporada, secreto, upload ni tabs Crear/Editar. Submit: `Crear logro`.

Tras `201`, navegar a `/equipos/:slug/logros`.

### Preview

El preview se actualiza solo con el estado del formulario, sin crear datos de dominio paralelos:

- fallback de título y descripción puramente editorial;
- PLAYER: etiqueta `Propuesta`, sin puntos/categoría inventados;
- TEAM_ADMIN: puntos y categoría solo cuando el usuario los ha introducido;
- media decorativa compartida, siempre placeholder.

## 5. Estados, validación y accesibilidad

### Catálogo

- **loading**: skeleton de toolbar + cards con 16:9; no cambiar el ancho del grid al resolver;
- **401**: sesión caducada, enlace a login;
- **403**: sin membresía contextual, volver a equipos;
- **404**: equipo no encontrado, volver a equipos;
- **error general**: mensaje y reintento que repite la única lectura;
- **catálogo vacío**: copy y CTA según rol;
- **filtro sin resultados**: conservar toolbar y ofrecer limpiar, sin confundirlo con catálogo vacío.

Abortar la lectura al cambiar slug/desmontar. No renderizar datos del slug anterior durante la transición.

### Formulario

- HTML labels reales, `required`, `maxLength`, `inputMode`/`type=number` adecuados y ayudas vinculadas con `aria-describedby`;
- errores de cliente junto al campo y resumen/alerta para error de servidor;
- conservar valores ante 400/403/409/5xx;
- submit deshabilitado y `aria-busy` mientras guarda para impedir doble envío;
- criterios con labels ordinales; no depender solo del placeholder;
- 401: explicar sesión caducada; 403: permisos cambiaron o rol no válido; 400: corregir campos; resto: reintento manual;
- cancelar vuelve al catálogo sin mutación.

El shell ya resuelve loading/401/403/404 de `/contexto`; el formulario no hace una segunda lectura para conocer el rol.

## 6. Responsive inferido

No hay referencia móvil; la adaptación debe preservar orden y cero overflow global.

- `< 640`: cabecera, resumen, toolbar y acciones apilados; grid de una columna; filtros con scroll horizontal interno; cards con ancho completo.
- `640–1023`: dos o tres columnas según ancho efectivo; búsqueda ocupa una línea propia cuando no cabe.
- `1024–1379`: cuatro o cinco columnas manteniendo card `>= 178 px`.
- `>= 1380`: seis columnas si el ancho efectivo lo permite.
- Formulario: una columna en móvil (`formulario → acciones → preview/ayuda`); dos columnas internas solo con espacio real. El rail deja de ser sticky al apilarse.
- Botones y controles mantienen al menos 40–44 px; textos largos truncan solo donde hay `title` o nombre accesible equivalente.

## 7. Regiones ignoradas y conceptos excluidos

Regiones visualmente conservadas mediante placeholder: media 16:9 de catálogo y preview. El banner e identidad ya pertenecen al shell congelado.

No implementar aunque aparezcan dibujados:

- temporada y selector de temporada;
- campana/notificaciones;
- cards secretas, candados, progreso parcial o barras de obtención;
- toggle lista/grid y paginación;
- categoría/puntos sugeridos por PLAYER;
- upload, selector de imagen, URL o persistencia de media;
- “por qué debería existir”, evidencia, adjuntos o comentarios;
- logro secreto, publicación comunitaria, obtención simultánea o solicitud automática;
- edición, tabs Crear/Editar o rutas nuevas.

## 8. Dependencias y riesgos

### T02 — catálogo

Dependencias satisfechas: shell/placeholder congelados, contexto real, GET catálogo enriquecido y fixture de 14 logros. No requiere backend.

Riesgos a vigilar:

- el tipo frontend está incompleto respecto al payload real;
- una rejilla fija de seis columnas antes de 1380 px bajaría de 178 px por card;
- categorías y textos largos del fixture deben truncar sin ensanchar la rejilla;
- no convertir `holdersCount` en progreso individual ni `earnedByMe=false` en “bloqueado”.

### T03 — formulario

Dependencias satisfechas: rol contextual, POST de propuestas y POST admin de logros. No requiere backend.

Riesgos a vigilar:

- enviar un body compartido a la propuesta produce 400 por `strict`;
- aceptar criterio vacío produce 400; eliminar/filtrar filas vacías debe respetar el mínimo PLAYER;
- puntos `""` no puede convertirse accidentalmente en `0`;
- no endurecer creación admin exigiendo descripción o criterios que el backend declara opcionales;
- la ruta Solicitudes todavía tiene UI V1; el redirect es funcional, su convergencia pertenece a UI-G7.

## 9. Criterio de implementación y captura

T02 se considera listo para QA cuando:

- hace una sola petición a `/logros`, sin arrays permanentes ni valores del fixture hardcodeados;
- PLAYER y TEAM_ADMIN comparten catálogo y geometría; solo cambia CTA/copy autorizada;
- a 1440 hay seis columnas legibles de al menos 178 px, media 16:9 y cero overflow;
- búsqueda, categorías, vacío real y cero resultados funcionan;
- no aparecen conceptos excluidos.

T03 se considera listo para QA cuando:

- la membresía PLAYER envía únicamente `{nombre,descripcion,criterios}` a `/propuestas`;
- la membresía TEAM_ADMIN envía creación directa únicamente a `/logros` con campos aprobados;
- ambos formularios conservan la composición 69/29, preview placeholder y estados accesibles;
- doble submit, errores y navegación posterior están resueltos;
- no existe upload ni media real.

Captura determinista recomendada:

1. catálogo PLAYER 1440 × 1024, con los 14 logros reales;
2. smoke catálogo TEAM_ADMIN 1440 × 1024 para CTA y geometría;
3. formulario PLAYER 1440 × 1024 con valores representativos no enviados;
4. formulario TEAM_ADMIN 1440 × 1024 con valores representativos no enviados;
5. smoke PLAYER 390 × 844 de catálogo y formulario;
6. tests de POST en la base desechable después de las capturas, restaurando el fixture antes de cualquier recaptura.

El gate visual exige cero P0/P1, sin overflow, rol y copy correctos, y aprobación de un crítico distinto del implementador.
