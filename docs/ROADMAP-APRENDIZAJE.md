# Pendientes del roadmap: valor de aprendizaje

Foto histórica anterior a la entrega G7/G8 del 2026-09-24; consultar estados actuales en [Roadmap](Roadmap.md). La clasificación pedagógica se conserva, incluidos conceptos ya implementados que todavía pueden necesitar práctica.

Clasificación del 2026-09-24. Fuente: [Roadmap](Roadmap.md). Cubre sus **66 casillas pendientes**, incluidas referencias repetidas entre fases; no son 66 entregas independientes. No modifica estados, prioridades, alcance aprobado ni pausas.

Esta es una estimación respecto al recorrido documentado, no una evaluación del dominio del usuario. Implementado no significa aprendido: una función realizada por agentes puede necesitar una sesión guiada. Si un concepto no se entiende aún, se practica aunque su código esté terminado.

- **NUEVO:** incluye un concepto o experiencia técnica relevante aún pendiente en el itinerario. Puede contener también trabajo repetitivo.
- **PRÁCTICA:** no exige un concepto nuevo principal; aplica o profundiza patrones ya utilizados. Sigue siendo útil para aprender a trabajar con autonomía.
- **CIERRE:** acabado, verificación o documentación; no añade por sí solo un concepto técnico. No significa prescindible para entregar el producto.
- **DEPENDE:** la novedad depende del alcance o de lo que ya esté configurado; se explica por caso.

Las clasificaciones indican el aporte principal de cada casilla, no sustituyen una clase ni deciden arquitectura. Los apuntes consolidan aprendizaje aunque no introduzcan otro tema.

## Catálogo completo

### Phase 5 – Deployment

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 1 | HTTPS (Let's Encrypt) — verificar si Cloudflare Tunnel ya provee TLS en el borde; quizá solo falta confirmarlo | **DEPENDE** | Si falta configurar TLS, aprender certificados y dónde termina el cifrado; si ya funciona, solo verificarlo. |

### Phase 6 – Multi-tenancy: modelo de datos (Relaciones en Prisma)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 2 | Lecturas adicionales por jugador, como `GET /equipos/:slug/jugadores/:id/logros`, cuando una tarea las requiera. El listado de jugadores, ranking y dashboard ya dispone de lecturas reales desde UI-G1. | **PRÁCTICA** | Otra lectura Express/Prisma con relaciones y aislamiento de equipo, patrones ya utilizados. |

### Phase 6.5 – Frontend V1 (code-first)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 3 | Comunidad: funcionalidad futura de Phase 8.5, fuera de la V1 completada | **NUEVO** | Referencia a 8.5: publicación entre equipos y copia frente a referencia; no es otra entrega. |

### Phase 7.7 – Propuestas de nuevos logros (parcial: backend y formulario entregados)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 4 | Separar propuestas y solicitudes de obtención en los historiales personales y sus detalles — UI-G7. | **PRÁCTICA** | Listados, detalles, estados y conexión con APIs existentes; mismo trabajo que G7. |
| 5 | Dividir administración en resumen y subrutas invitaciones, jugadores, logros, solicitudes y propuestas, incluidos detalles — UI-G8. | **PRÁCTICA** | Rutas anidadas, navegación y permisos existentes; mismo trabajo que G8. |
| 6 | Completar el recorrido visual de revisión y obtención mediante esos historiales/paneles y su QA. | **CIERRE** | Verificar el recorrido completo y corregir diferencias; no introduce por sí mismo una tecnología. |
| 7 | Imagen en propuestas: ampliación de Phase 10 que reutiliza el almacenamiento de Phase 7.10. | **DEPENDE** | Referencia a Phase 10: reutiliza uploads de 7.10; puede ampliar el ciclo de propiedad del archivo. |

### Phase 7.8 – Identidad global y alias contextual

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 8 | Perfil global consultable/editable y formulario correspondiente — issue #27. | **PRÁCTICA** | Consultar/editar datos propios, validar entrada y conectar un formulario; refuerza autorización y actualizaciones. |
| 9 | Edición tenant-scoped del alias y decisión de permisos PLAYER/TEAM_ADMIN — issue #28. | **PRÁCTICA** | Aplicar roles y aislamiento ya conocidos; decidir quién puede editar es una decisión de producto. |
| 10 | Retirar `User.displayName` cuando no queden consumidores ni datos dependientes del campo legado. | **NUEVO** | Completar una retirada compatible: comprobar consumidores/datos y eliminar el campo legado sin romper lecturas. |
| 11 | Avatar general y foto opcional por equipo, validación de imágenes, almacenamiento y reemplazo seguro — issue #23, coordinado con Phase 7.10; prioridad acordada: equipo → general → iniciales. | **NUEVO** | Primera integración de archivos y reemplazo seguro; se aprende en 7.10, no se cuenta dos veces. |

### Bloque vinculado a 7.8/7.9 — Ciclo de vida del jugador (gap 21)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 12 | PLAYER-LC-T01 — Diseñar separación entre acceso, ficha actual e historial; depende del inventario de media T02.01 y precede a su relación avatar/equipo T03.02. | **NUEVO** | Separar permiso de acceso, ficha conservada e historial: una baja no equivale a borrar todos los datos. |
| 13 | PLAYER-LC-T02 — Persistencia compatible y migración coordinada con media. | **PRÁCTICA** | Aplicar relaciones y migraciones compatibles ya usadas a ese nuevo modelo de conservación. |
| 14 | PLAYER-LC-T03 — Salida, archivo y reingreso con permisos/contadores correctos; requisito para completar avatar específico T05.08. | **NUEVO** | Modelar archivo y reingreso, recuperando historial sin recuperar permisos indebidamente. |
| 15 | PLAYER-LC-T04 — Eliminación explícita y limpieza del avatar con conservación de resultados cerrados; usa media T05.06/T05.08. | **NUEVO** | Borrado selectivo y conservación de resultados históricos; coordinar cambios de base de datos y archivos. |
| 16 | PLAYER-LC-T05 — Controles y filtros administrativos, al definir nuevas pestañas y coordinar UI-G8. | **PRÁCTICA** | Formularios, filtros y acciones administrativas sobre contratos definidos. |
| 17 | PLAYER-LC-T06 — QA de históricos, reingreso, aislamiento y frontend. | **PRÁCTICA** | Diseñar casos de transición e invariantes: propiedades que deben seguir siendo ciertas tras cada operación. |
| 18 | PLAYER-LC-T07 — Evidencia y documentación, sin dar por cerradas 7.8/7.9/UI-G8. | **CIERRE** | Explicar y registrar lo realizado; consolida aprendizaje, sin concepto técnico independiente. |

### Phase 7.9 – Temporadas por equipo

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 19 | Diseñar e implementar la administración visual de temporadas en #11: concretar ubicación/navegación, listar y crear temporadas y activar/cerrar mediante los endpoints existentes, con estados y errores reales; coordinar su entrada con UI-G8 sin añadir una ruta todavía. | **PRÁCTICA** | Conectar formularios y acciones a la API existente; estados de temporada ya implementados. |
| 20 | Implementar el selector de históricos y conectar el ranking de la temporada elegida; distinguir periodo activo/cerrado, permanentes y estacionales sin mezclar progresos entre ediciones. | **PRÁCTICA** | Selección de periodo y carga de datos sin mezclar contextos; refuerza estado de interfaz y filtros. |
| 21 | Completar QA de #11 para gestión e históricos, incluyendo permisos, transiciones inválidas, una única temporada activa, ausencia de temporada, carga/error/vacío y aislamiento; reutilizar la cobertura de #30/#29 sin declarar probados los casos restantes. | **PRÁCTICA** | Cubrir transiciones, permisos y aislamiento; enseña diseño de casos, sin otra infraestructura obligatoria. |

### Phase 7.10 — Imágenes y almacenamiento

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 22 | MEDIA-10A-T02 — Inventario, componentes/configuración, recursos, cola/temporales y contrato técnico — T02.01–T02.04. | **NUEVO** | Diseñar trabajos en espera, límites de recursos y archivos temporales; Docker básico ya es conocido. |
| 23 | MEDIA-10A-T03 — Diseñar API/permisos, referencias, migración compatible y pruebas — T03.01–T03.03; coordinar PLAYER-LC-T01. | **NUEVO** | Relacionar referencias en DB con archivos externos y definir permisos y fallos entre ambos sistemas. |
| 24 | MEDIA-10A-T04 — Servicio privado y adaptador S3; operaciones y persistencia tras recreación — T04.01/T04.02. | **NUEVO** | Almacenamiento de objetos privado y adaptador compatible con S3: ocultar el proveedor tras una interfaz. |
| 25 | MEDIA-10A-T05 — Base común y logros (T05.01–T05.06); logos (T05.07) después del logro completo; avatares (T05.08) después de logos y PLAYER-LC-T03. | **NUEVO** | Recepción y validación de archivos, procesamiento, variantes, cola, cancelación y limpieza. Logos/avatares reutilizan la base. |
| 26 | MEDIA-10A-T06 — Corpus autorizado y carga repetible por etapa — T06.01/T06.02; pesos reales en MEDIA-CAPACITY. | **PRÁCTICA** | Preparar datos reproducibles y medir pesos reales; amplía la práctica de fixtures existente. |
| 27 | MEDIA-10A-T07 — Ubicaciones/excepción visual T07.01 (aplazada); integrar logro T07.02 → logo T07.03 → avatares T07.04. | **NUEVO** | Primera UI de subida/recorte y seguimiento de trabajos durante navegación; repetirla para otros tipos es práctica. |
| 28 | MEDIA-10A-T08 — Puerta del logro completo T08.01 antes de ampliar; consumo T08.02 y regresión conjunta T08.03. | **NUEVO** | Medir consumo y comprobar límites, concurrencia, fallos y recuperación en el sistema de archivos; incluye regresión conocida. |
| 29 | MEDIA-10A-T09 — Evidencia/apuntes T09.01 y sincronización de entrega local T09.02; sin declarar despliegue. | **CIERRE** | Evidencia, apuntes y estado de entrega; no son otro bloque técnico. |

### UI Workstream V2 – Visual convergence (PAUSADO)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 30 | **UI-G7 — Requests / My proposals**: historial personal y detalles respaldados por las referencias vigentes | **PRÁCTICA** | Mismo trabajo que 7.7: listados y detalles usando patrones existentes; workstream pausado. |
| 31 | **UI-G8 — Team Admin**: resumen + subrutas acordadas; T05/T06/T07 integran progreso/secretos ya funcionales de #30/#29 y T08 verifica su regresión. Gestión visual de temporadas e históricos permanece en #11. [Alcance](ui-workstream/PLAN.md#ui-g8--team-admin). | **PRÁCTICA** | Mismo trabajo que 7.7: componer subrutas y controles ya funcionales; workstream pausado. |
| 32 | **UI-A1 — Login/registro**: implementados y capturados; gate final UI-A1-T04 aplazado hasta completar la estructura | **CIERRE** | Capturas, comparación y ajustes de una implementación existente; aplazado y workstream pausado. |
| 33 | **UI-A2 — Mis equipos/unirse/solicitar acceso**: implementados; QA UI-A2-T04 aplazado hasta completar la estructura y gate T05 pendiente | **CIERRE** | QA de flujos reales y cierre visual; no confundirlo con implementar los gaps de producto; pausado. |
| 34 | **UI-G9 — Consistency Pass**: regresión visual, responsive base y gates finales | **CIERRE** | Regresión, responsive y coherencia entre pantallas; profundiza calidad frontend, sin novedad backend prevista. |
| 35 | Integrar imágenes reales de logros/logos/avatares mediante Phase 7.10 tras definir controles y excepción visual; hasta entonces mantener placeholders. Banners/fotografía siguen en las ampliaciones futuras de Phase 10. | **PRÁCTICA** | Conectar imágenes ya gestionadas por 7.10; el nuevo aprendizaje de almacenamiento está allí. |

### Phase 8 – Ranking y Aggregaciones SQL

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 36 | Profundización de aprendizaje «SQL — Aggregaciones»: GROUP BY/SUM/COUNT y elección de consultas, sin dar por exigida una reimplementación del ranking | **NUEVO** | Práctica explícita de GROUP BY, SUM y COUNT: agrupar y calcular en la base de datos aunque el ranking ya funcione. |
| 37 | Regresión final de estados 401/403/404 del ranking — ya asignada a UI-G9, no crear una segunda tarea | **CIERRE** | Misma regresión que G9; comprobar errores conocidos sin duplicar tarea. |

### Phase 8.5 – Comunidad de logros

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 38 | Publicación de logros: **tabla PLANTILLA separada** (`PlantillaLogro`/`LogroPublicado`) distinta del `Logro`-instancia del equipo — decidido en Phase 6. Lleva `firma` (`@default("anonimo")`, autoría *display* que elige el proponente) + atribución al autor real. El `Logro` del equipo es una COPIA de la plantilla | **NUEVO** | Separar plantilla compartida e instancia privada; autoría y límites de acceso entre equipos. |
| 39 | Página `/comunidad` — galería navegable de logros publicados; `/comunidad/[id]` — detalle (qué equipos lo implementaron) | **PRÁCTICA** | Galería y detalle repiten lecturas/listados conocidos sobre el nuevo dominio comunitario. |
| 40 | Acción "implementar": **copia independiente** al catálogo del equipo, con atribución al autor (la copia es editable y no cambia si el original cambia) | **NUEVO** | Copiar una entidad con atribución y autonomía posterior, en lugar de compartir un objeto mutable. |
| 41 | Proponer publicar/implementar: PLAYER propone → TEAM_ADMIN aprueba (reutiliza el flujo de Phase 7.6) | **PRÁCTICA** | Reutilizar la máquina de aprobación existente con permisos del nuevo contexto. |
| 42 | `apuntes.md`: sección "Comunidad — features cross-tenant" | **CIERRE** | Consolidar por escrito el aprendizaje de comunidad. |

### Phase 9 – UI Component Library (shadcn/ui)

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 43 | Migrar las páginas de lectura (`/equipos/[slug]/logros`, `/equipos/[slug]/logros/[id]`, landing) a **Server Components** — el fetch ocurre en el servidor (mejor SEO y velocidad inicial) | **NUEVO** | Distinguir ejecución en servidor y navegador y sus límites; la mejora de rendimiento depende de la implementación. |
| 44 | Estados de carga y error con `loading.tsx` y `error.tsx` del App Router (Suspense boundaries) | **NUEVO** | Límites de carga y error por segmentos, y Suspense; no es solo dibujar otro spinner. |
| 45 | Instalar y configurar shadcn/ui en el frontend Next.js | **NUEVO** | Aprender composición de primitivas y componentes accesibles; instalar el paquete por sí solo aporta poco. |
| 46 | Reemplazar Tailwind manual con: Card, Badge, Table, Button, Input, Dialog | **PRÁCTICA** | Tras aprender la librería, sustituir repetidamente tarjetas/botones es integración; no exige rehacer lo aprobado. |
| 47 | "Sala de trofeos": grid de cards con iconos grandes, nombre, puntos, cuántos la tienen | **PRÁCTICA** | Composición de cards y consultas existentes; revisar solapamiento con el catálogo ya entregado. |
| 48 | Toggle dark/light mode con `next-themes` | **NUEVO** | Tema persistente y coordinación entre renderizado del servidor, navegador y preferencias del usuario. |
| 49 | `apuntes.md`: sección "shadcn/ui — Librería de componentes" | **CIERRE** | Consolidar lo aprendido; no un concepto independiente. |

### Phase 10 — Ampliaciones de imágenes y otros archivos

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 50 | MEDIA-EXT-T01 — Imagen adjunta a propuestas y su ciclo de revisión/incorporación al catálogo, vinculada a Phase 7.7 y apoyada en el almacenamiento de 7.10. | **DEPENDE** | Tras 7.10, adjuntar una imagen es práctica; su transferencia al catálogo/rechazo puede añadir reglas nuevas de propiedad y limpieza. |
| 51 | Otros tipos de archivos, banners o fotografía decorativa: definir alcance, permisos y ciclo de vida antes de integrar. | **DEPENDE** | Otro banner del mismo formato reutiliza media; otros tipos de archivo podrían exigir validación/procesamiento nuevos. Alcance sin definir. |
| 52 | Documentar en `apuntes.md` los conceptos de cada ampliación efectivamente implementada. | **CIERRE** | Documentar únicamente lo realmente aprendido e implementado. |

### Phase 11 – Testing

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 53 | Backend: tests con Vitest + supertest (rutas /logros, /auth, middlewares) | **NUEVO** | Aprender de forma guiada diseño de pruebas unitarias/HTTP, aislamiento y casos negativos; ya hay pruebas, no se parte de cero. |
| 54 | Frontend: React Testing Library para componentes clave (ranking, login form) | **NUEVO** | Probar comportamiento e interacciones de componentes desde la perspectiva del usuario. |
| 55 | GitHub Actions: los tests corren **antes** del build de imágenes — si fallan, no se publica a GHCR (CI como gate real, no solo como build) | **NUEVO** | Convertir CI en una condición de publicación: un test fallido impide construir/publicar la entrega prevista. |
| 56 | `apuntes.md`: sección "Testing — Vitest y Supertest" | **CIERRE** | Consolidar estrategia y ejemplos de pruebas. |

### Backlog de producto detectado en el dashboard — sin fase asignada

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 57 | [Etiquetas personalizables de jugadores (#31)](https://github.com/JavierLoro/webLogrosApp/issues/31): catálogo por equipo y concesión por TEAM_ADMIN; definir personalización, visibilidad y retirada. No otorgan permisos ni puntos. Detalle en BACKEND-GAPS.md, apartado 20. | **PRÁCTICA** | Catálogo y relación muchos-a-muchos, altas/bajas y permisos conocidos; pendiente concretar personalización. |

### Phase 12 – Real-Time con WebSockets

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 58 | `socket.io` en el backend adjunto al servidor HTTP de Express | **NUEVO** | Conexiones persistentes y comunicación por eventos, frente a petición/respuesta HTTP. |
| 59 | `socket.io-client` en el frontend Next.js | **NUEVO** | Ciclo de conexión del cliente, suscripciones y limpieza; reconexión como tema a tratar al concretar el alcance. |
| 60 | Evento `logro:assigned` — toast de notificación en tiempo real al ganar un logro (scoped al equipo) | **NUEVO** | Enviar eventos solo a los miembros autorizados del equipo; coordinar confirmación del cambio y notificación. |
| 61 | Feed en vivo en el dashboard del equipo (últimas 5 asignaciones) | **PRÁCTICA** | Aplicar el canal aprendido al feed; ordenar y evitar duplicados puede servir de profundización. |
| 62 | `apuntes.md`: sección "WebSockets — Tiempo real con socket.io" | **CIERRE** | Consolidar conexiones, eventos y aislamiento por equipo. |

### Phase 5.5 – Hardening

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 63 | **Copias offsite del backup** (pasos manuales del host, documentados en apuntes) — cronjob `rsync` a otro disco/CT del Proxmox + opción `rclone` a Google Drive (regla 3-2-1) | **NUEVO** | Copias fuera del servidor, automatización y recuperación; el backup local existente no cubre esa experiencia. Al despliegue definitivo. |

### Preparación de despliegue y evolución del alojamiento — seguimiento separado

| Nº | Pendiente del roadmap | Aporte | Qué se aprende o practica |
| --- | --- | --- | --- |
| 64 | MEDIA-DEP-T01–T04 — Preparar servidor propio, decidir backups, probar restauración conjunta y desplegar. Coordinado con Phase 5.5 y HTTPS; aplazado por el usuario. | **NUEVO** | Especialmente T02/T03: copia y restauración consistente de DB + archivos. T01/T04 refuerzan despliegue conocido; último bloque acordado. |
| 65 | MEDIA-R2-T01 — Migración a Cloudflare R2 cuando se solicite: copia verificada, coordinación de escrituras y vuelta atrás; sin contratación actual. | **NUEVO** | Migración entre proveedores con copia verificada, coordinación de escrituras y vuelta atrás; solo cuando se solicite. |
| 66 | Reutilizar evidencia de 7.10 y comprobar el entorno de destino; piloto local no equivale a despliegue. | **CIERRE** | Verificación del entorno de destino y recopilación de evidencia, sin atribuir el PASS local a producción. |

## Gaps vinculados, sin casilla propia en el roadmap

Incluidos para no perder los pendientes enlazados desde [BACKEND-GAPS](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). No implican aprobación para implementar.

| Pendiente | Aporte | Motivo |
| --- | --- | --- |
| #12 Deporte/tipo de equipo | PRÁCTICA | Campo de dominio, validación, persistencia y presentación; patrones conocidos. |
| #14 Seguimiento persistente de solicitudes | PRÁCTICA | Lectura autorizada de un estado y su pantalla; permisos y producto pendientes de acordar. |
| #15 Email y plazos | NUEVO / DEPENDE | Integración de correo y gestión de fallos serían nuevos; fijar un plazo de revisión es producto, no tecnología. |
| #17 Recuperación de contraseña | NUEVO | Flujo con token limitado, caducidad y uso único; distinto del login ya hecho. Diseño por definir. |
| #18 Recordar sesión | DEPENDE | Cambiar duración es práctica; añadir renovación/revocación de sesiones introduciría conceptos nuevos, aún no acordados. |
| #19 Google/GitHub | NUEVO | Autenticación delegada, retorno del proveedor y vinculación de identidad; alcance por definir. |
| #21 Términos/privacidad | DEPENDE | Contenido/enlaces son trabajo de producto; registrar versiones y aceptación podría añadir trazabilidad. Sin definir. |

#11, #22/#23, #27/#28, #31 y gap 21 ya están clasificados arriba. #10, #13/#20, #24 y #29/#30 constan completados localmente y no se reabren. Publicar cambios/cerrar issues es trabajo de entrega, no una funcionalidad nueva.

## Lectura pedagógica por bloques

- **7.7:** lo pendiente es sobre todo práctica de frontend y cierre; su concepto central de propuestas/aprobación ya está implementado. Imágenes se aprenden en 7.10, con ampliación posterior en Phase 10.
- **7.8:** perfil/alias son práctica; retirar el campo legado permite aprender a completar una migración compatible. Avatares comparten la lección de 7.10.
- **7.9:** lo pendiente es principalmente UI y QA. Si el usuario no trabajó el modelo de temporadas, revisarlo guiado sigue teniendo valor, sin declararlo otra implementación pendiente.
- **7.10 y ciclo de vida del jugador:** principal bloque nuevo previsto: archivos externos, trabajos en segundo plano, fallos, conservación e historial. Conviene aprenderlo por recorridos pequeños.
- **8:** aprendizaje SQL explícitamente pendiente aunque el producto ya tenga ranking.
- **8.5:** nuevo modelado de publicación y copia entre equipos; sus pantallas y aprobaciones reutilizan lo conocido.
- **9:** nuevos conceptos frontend en servidor/cliente, carga/error y temas; reemplazar todos los componentes no es necesario para demostrar comprensión. El alcance requiere reconciliación, sin cambiarlo aquí.
- **10:** mayormente extensión de media; la novedad depende de las reglas de archivos que se acuerden.
- **11 y 12:** pruebas como práctica sistemática y comunicación en tiempo real aportan nuevos bloques formativos.
- **5/5.5 y despliegue:** TLS si falta, backups externos, restauración conjunta y migración de proveedor; se mantiene su ubicación al final y backups con despliegue definitivo.

UI Workstream V2 permanece **PAUSADO**. G6 conserva su cierre provisional y no entra en las 66 casillas pendientes. Esta clasificación no activa ningún ejercicio ni reordena el roadmap.
