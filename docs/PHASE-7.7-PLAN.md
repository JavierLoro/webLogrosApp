# Phase 7.7 — Plan de implementación de pendientes

Fecha: 2026-09-24. Estado: PASOS 1–7 COMPLETADOS LOCALMENTE; paso 8 pendiente. Petición: planificar lo pendiente de propuestas, sin reanudar UI Workstream V2.

**Entrega acotada — 2026-09-24:** G7/G8 y pasos 1–7 de 7.7 completados y verificados localmente. Evidencia: [resultado](phase-7.7/RESULT.md). A1/A2 siguen aplazados, G6 provisional y G9 sin iniciar; el resto del workstream conserva la pausa solicitada. Imágenes de propuestas pendientes de 7.10/Phase 10.

## Objetivo y límites

Completar el recorrido de una propuesta desde el historial personal hasta la resolución administrativa y la incorporación al catálogo; mantener separado el recorrido posterior de solicitud de obtención.

Ya existen persistencia, permisos, aprobación/rechazo y formulario por rol. Reutilizarlos. No rehacer ese dominio ni considerar que aprobar una propuesta concede el logro o puntos.

Fuentes: [Roadmap](Roadmap.md), [Architecture](Architecture.md), [PLAN visual](ui-workstream/PLAN.md), [TASKS](ui-workstream/TASKS.md) y [STATUS](ui-workstream/STATUS.md). Este plan desglosa las tareas existentes G7/G8; no crea una cola paralela. Su ejecución y estados se siguen en TASKS/STATUS. La inspección documental y del árbol de rutas identifica las páginas actuales de solicitudes y administración; la auditoría de contratos está documentada en [CONTRACTS](phase-7.7/CONTRACTS.md).

**Autorización vigente:** «montalo y ves explicando lo realizado y porque» reanuda pasos 1–7 (G7/G8 y su QA). Las imágenes conservan la dependencia pendiente de 7.10/Phase 10. Al ejecutar trabajo visual, usar manifest, referencias canónicas y skill image-to-code; comparación directa por Coordinator.

## Secuencia de entrega

| Paso | Correspondencia | Trabajo concreto | Dependencia | Condición de cierre |
| --- | --- | --- | --- | --- |
| 1. Inventario de contratos y pantallas | G7-T01; preparación de G8-T01 | Revisar páginas actuales, cliente API, DTO y permisos disponibles. Relacionar datos reales con cada listado/detalle/acción. Identificar enlaces y estados existentes. | Reanudación o alcance explícito | Matriz pantalla → contrato → permisos → estados; faltantes documentados y ninguna API supuesta. |
| 2. Historial personal | G7-T02 | En `/equipos/[slug]/solicitudes`, distinguir «Mis propuestas» y «Mis solicitudes de obtención». Mostrar estado real y datos disponibles; propuesta aprobada se presenta como «Añadida al catálogo». | Paso 1 | Cada usuario ve su historial autorizado, sin mezclar tipos ni filtrar datos privados solo en cliente. |
| 3. Detalles personales y cierre G7 | G7-T03/T04/T05 | Mostrar información disponible, estado, motivo de rechazo y enlace al logro incorporado cuando exista. Concretar apertura del detalle dentro de la navegación aprobada; Architecture no fija nuevas rutas personales de detalle, por lo que no se inventarán. QA/capturas, comparación y correcciones. | Paso 2; lectura de detalle confirmada en paso 1 | Listado → detalle → retorno conserva contexto; estados reales y gate G7 cumplido con evidencia. |
| 4. Estructura administrativa y acciones existentes | G8-T01/T02/T03/T04/T05 | Añadir navegación y breadcrumbs; raíz como resumen. Separar invitaciones, jugadores y logros/asignación en sus subrutas acordadas, trasladando funciones existentes sin perderlas. | Paso 1; secuencia prevista tras G7 | Enlaces directos y recarga funcionan; Administración permanece activa; solo el rol autorizado gestiona su equipo. |
| 5. Solicitudes de obtención | G8-T06 | Listado y `/admin/solicitudes/[id]` bajo el slug. Mostrar estado, contexto estacional y progreso disponible; aprobar/rechazar con motivo y refrescar datos tras la respuesta real. | Paso 4 | Concesión progresiva solo con objetivo cumplido; se conserva la temporada original de la solicitud y el error real del servidor. |
| 6. Revisión de propuestas | G8-T07 | Listado y `/admin/propuestas/[id]` bajo el slug. Al incorporar, integrar tipo, objetivo cuando corresponda, alcance y secreto según el contrato existente. Rechazar con motivo. | Paso 4; ejecutar después del paso 5 | Aprobar incorpora un único logro; no concede, no suma puntos y no crea solicitud de obtención. Rechazar conserva motivo en el historial. |
| 7. Regresión y cierre de la entrega sin imágenes | G8-T08 y cierre de pendientes 7.7 relacionados | Comprobar recorridos personales/administrativos, roles, errores y estados; regresión de progreso, secretos y temporadas. Capturas y comparación directa del Coordinator. | Pasos 3–6 | Evidencia funcional y visual, lint/TypeScript/build pertinentes, sin regresiones materiales; actualizar TASKS y STATUS conjuntamente cuando se cierre. |
| 8. Imágenes en propuestas | Phase 10, MEDIA-EXT-T01 | Definir adjunto, lectura, rechazo, conservación, retirada y relación con el logro creado; implementar mediante la base de media existente cuando esté lista. | Base necesaria de 7.10 implementada y verificada; alcance de ampliación definido | Recorrido con imagen y fallos probado; permisos y limpieza reales; cierre independiente documentado. |

El paso 4 incluye trabajo compartido de administración que el roadmap ya vincula a 7.7/G8. No implica que las invitaciones o los jugadores sean nuevas capacidades del dominio de propuestas.

## Rutas y archivos de referencia

Puntos actuales a revisar al iniciar:

- `apps/frontend/src/app/equipos/[slug]/solicitudes/page.tsx`.
- `apps/frontend/src/app/equipos/[slug]/admin/page.tsx`.
- `apps/frontend/src/app/equipos/[slug]/logros/nuevo/page.tsx` y `formModel.ts`: preservar creación/propuesta por rol.

Subrutas administrativas acordadas, siempre bajo `/equipos/[slug]/admin`: `invitaciones`, `jugadores`, `logros`, `solicitudes`, `solicitudes/[id]`, `propuestas` y `propuestas/[id]`. La separación frontend no obliga a renombrar APIs. El inventario decidirá los componentes reutilizables y archivos auxiliares concretos antes de editar.

No añadir gestión de temporadas, edición de perfil/alias, archivo/eliminación de jugadores ni funciones comunitarias por aprovechar estas pantallas: mantienen sus planes y pendientes independientes. Preservar progreso/secretos ya entregados, sin reimplementar su backend.

## Estados y comprobaciones de aceptación

Aplicar a listados, detalles y acciones según corresponda:

- Carga, vacío, error recuperable, sesión ausente, permiso insuficiente y recurso inexistente.
- Propuestas pendientes, aprobadas y rechazadas; solicitudes de obtención separadas en sus tres estados.
- Deshabilitar envíos mientras están pendientes; mostrar éxito únicamente tras confirmación del servidor.
- Si otro administrador ya resolvió el elemento, mostrar la respuesta real y actualizar su estado; no sobrescribir ni inventar una resolución.
- Usuario de otro equipo no puede leer ni resolver por URL o ID. Datos secretos permanecen censurados conforme al contrato existente.
- Progresivos: sin empezar, parcial, objetivo alcanzado y concedido; no permitir concesión anticipada ni cambios de contador después de conceder.
- Temporadas: usar contexto original de solicitud; no sustituir un progreso histórico ausente por el actual. Registrar cualquier lectura faltante como gap antes de implementarla.
- Navegación con teclado, foco y mensajes accesibles, escritorio/móvil sin desbordamientos.

Recorridos mínimos de prueba:

1. PLAYER propone → aparece pendiente → TEAM_ADMIN aprueba → aparece en catálogo y en historial como incorporada → PLAYER solicita obtención por separado → resolución válida actualiza la concesión.
2. PLAYER propone → TEAM_ADMIN rechaza con motivo → PLAYER ve el rechazo, sin incorporación ni puntos.
3. Resolver dos veces, entrar sin sesión, acceder desde otro equipo y abrir un ID inexistente producen estados reales sin duplicaciones ni filtraciones.
4. Tras dividir administración, invitaciones, gestión existente de jugadores, asignación directa y progreso/secretos conservan su comportamiento.

Reutilizar pruebas/evidencia existentes para dominio sin cambios; añadir comprobaciones de los nuevos recorridos y regresiones afectadas. No ejecutar seed/reset ni levantar servicios en esta fase documental.

## Dependencias de backend y aprendizaje

El plan parte de APIs existentes, pero no afirma que todos los detalles tengan ya el contrato necesario. Paso 1 debe comprobarlo. Un faltante se registra con el dato/acción y el alcance mínimo propuesto antes de asumir cambios de backend; no usar datos ficticios.

Si se acuerda una ampliación backend, aplicar explicación previa, learning-comments y apuntes después de verificarla. Los pasos 2–7 son principalmente práctica de patrones existentes. El aprendizaje inicial de uploads corresponde a 7.10; el paso 8 reutiliza esa base y concreta nuevas reglas de propiedad/conservación si son necesarias.

## Qué significa terminar

- **Entrega de historiales y administración sin imágenes:** pasos 1–7 completos; cubre los tres pendientes visuales/funcionales de 7.7 y sus gates G7/G8, sin dar por terminadas 7.9, A1/A2 ni G9.
- **Phase 7.7 completa según su alcance actual:** además, paso 8 completo. Hasta entonces la imagen en propuestas sigue pendiente en Phase 10; no marcar toda 7.7 DONE por cerrar solo las pantallas.

Entrega del 2026-09-24: pasos 1–7 DONE, paso 8 TODO. Auditoría, implementación, validación y límites en [RESULT](phase-7.7/RESULT.md). El resto del workstream conserva la pausa solicitada.
