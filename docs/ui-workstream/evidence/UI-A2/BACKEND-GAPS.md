# Frontend deseado — Registro unificado de pendientes

Registro unificado de gaps backend, decisiones de producto, assets/frontend y QA detectados durante acceso/onboarding (UI-A1/UI-A2) y refinamientos del dashboard. Se conserva la ruta histórica BACKEND-GAPS.md, aunque no todos los puntos sean backend. Incluye referencias a trabajo separado del roadmap, no todo el roadmap como cola de ejecución. No propone endpoints como hechos ni autoriza implementación.

## Seguimiento en GitHub

Etiquetas de clasificación (no equivalen a aprobación ni estado de ejecución):

- `gap`: falta de datos o soporte para el frontend deseado — #10, #12, #13 y #22.
- `funcionalidad deseada`: ampliación futura — #11, #14, #15, #17, #18, #19, #20, #21, #23, #24, #27, #28, #29, #30 y #31.
- `qa`: pruebas y convergencia visual, no nueva funcionalidad — #25.

Al incorporar nuevos puntos o cambiar su alcance, mantener coherentes las etiquetas y este registro.

Al resolver una issue, actualizar **en el mismo cambio** tanto su apartado de este documento como la fila siguiente: marcar **COMPLETADO**, describir el resultado y enlazar la PR/commit y las validaciones. No cerrar la issue dejando este documento desactualizado. Si se descarta o aplaza, registrar **DESCARTADO** o **APLAZADO** con el motivo, sin confundirlo con una implementación completada. Los nuevos gaps deben enlazarse con su issue sin duplicados y conservar la distinción entre requisito aprobado y decisión pendiente.

| Apartado | Issue | Estado | Alcance |
| --- | --- | --- | --- |
| 1. Estadísticas | [#10](https://github.com/JavierLoro/webLogrosApp/issues/10) | COMPLETADO | PR #26; logros y jugadores reales |
| 2. Temporada | [#11](https://github.com/JavierLoro/webLogrosApp/issues/11) | PENDIENTE DE DECISIÓN | No es requisito aprobado |
| 3. Deporte | [#12](https://github.com/JavierLoro/webLogrosApp/issues/12) | PENDIENTE | Presentación solicitada; diseño backend pendiente |
| 4. Identidad global | [#13](https://github.com/JavierLoro/webLogrosApp/issues/13) | IMPLEMENTADO LOCAL — pendiente integración | Nombre/apellidos globales y alias tenant; edición separada en #27/#28 |
| 5. Seguimiento de solicitudes | [#14](https://github.com/JavierLoro/webLogrosApp/issues/14) | PENDIENTE DE DECISIÓN | Producto, permisos y lectura por acordar |
| 6. Email y plazos | [#15](https://github.com/JavierLoro/webLogrosApp/issues/15) | PENDIENTE DE DECISIÓN | Sin garantías ni promesas actuales |
| 7. Recuperación de contraseña | [#17](https://github.com/JavierLoro/webLogrosApp/issues/17) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 8. Recordar sesión | [#18](https://github.com/JavierLoro/webLogrosApp/issues/18) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 9. Acceso con Google y GitHub | [#19](https://github.com/JavierLoro/webLogrosApp/issues/19) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 10. Nombre en el registro | [#20](https://github.com/JavierLoro/webLogrosApp/issues/20) | IMPLEMENTADO LOCAL — pendiente integración | Registro persiste nombre y apellidos globales |
| 11. Términos y privacidad en acceso | [#21](https://github.com/JavierLoro/webLogrosApp/issues/21) | PENDIENTE DE DEFINICIÓN | Producto/contenido/frontend |
| 12. Logos de equipo PNG transparentes | [#22](https://github.com/JavierLoro/webLogrosApp/issues/22) | PENDIENTE — visual acordado | Assets/frontend y contrato por definir |
| 13. Imágenes reales, avatares y uploads | [#23](https://github.com/JavierLoro/webLogrosApp/issues/23) | PENDIENTE DE DEFINICIÓN | Assets/backend/frontend |
| 14. Auth Hardening con cookies HttpOnly | [#24](https://github.com/JavierLoro/webLogrosApp/issues/24) | PENDIENTE — roadmap separado | Backend/frontend — roadmap separado |
| 15. Cerrar QA y convergencia visual de acceso y onboarding | [#25](https://github.com/JavierLoro/webLogrosApp/issues/25) | EN CURSO — gate pendiente | Frontend/QA — no gap backend |
| 16. Perfil global editable | [#27](https://github.com/JavierLoro/webLogrosApp/issues/27) | PENDIENTE | Consulta/edición autenticada y formulario |
| 17. Alias editable por equipo | [#28](https://github.com/JavierLoro/webLogrosApp/issues/28) | PENDIENTE DE DECISIÓN | Permisos y edición tenant-scoped |
| 18. Logros secretos | [#29](https://github.com/JavierLoro/webLogrosApp/issues/29) | PENDIENTE DE DEFINICIÓN | Visibilidad, permisos y desbloqueo |
| 19. Progreso parcial por jugador | [#30](https://github.com/JavierLoro/webLogrosApp/issues/30) | PENDIENTE DE DEFINICIÓN | Avance persistente, validación y obtención |
| 20. Etiquetas personalizables de jugadores | [#31](https://github.com/JavierLoro/webLogrosApp/issues/31) | PENDIENTE DE DEFINICIÓN | Catálogo por equipo y concesión por TEAM_ADMIN |

Estas issues registran backlog, no autorizan implementación ni amplían UI-A2. El archivo debe publicarse junto con los cambios locales pendientes para que esté disponible también desde GitHub.

## 1. Estadísticas de las cards de equipo



### Decisión funcional

- **Logros** cuenta todos los logros del catálogo del equipo.
- **Jugadores** cuenta exclusivamente las membresías con rol `PLAYER`.
- Una membresía `TEAM_ADMIN` no cuenta como jugador con el modelo actual. La propuesta para
  permitir ambos roles se sigue separadamente en [#16](https://github.com/JavierLoro/webLogrosApp/issues/16).
- No se incorporan temporadas ni otras métricas no respaldadas por el dominio actual.

### Contrato agregado

`GET /api/equipos/mis-equipos` añade a cada resumen:

```ts
stats: {
  achievements: number
  players: number
}
```

Los valores proceden de conteos reales de PostgreSQL dentro de la consulta que carga las
membresías del usuario. No se realiza una petición adicional por equipo.

### Estado de cierre

Validación local realizada sobre la base aislada `weblogros_ui_windows` y el fixture determinista:

- compilación TypeScript del backend: PASS;
- lint y build de producción del frontend: PASS;
- consulta real de Halcones: `achievements: 14`, `players: 10` (sus dos `TEAM_ADMIN` no cuentan);
- `git diff --check`: PASS.

Resolución implementada en el [commit `aa571ae`](https://github.com/JavierLoro/webLogrosApp/commit/aa571ae).

Integración local: se conserva TeamsOverview y el rediseño de onboarding; métricas incorporadas sin volver a la presentación antigua.

## 2. Temporada

La referencia dibuja `Temporada 2024/25`, pero el dominio actual no define temporadas. Esto no es un requisito backend aprobado: es una decisión funcional futura. UI-A2 omite el dato.

## 3. Tipo o descripción del equipo

Actualización del usuario (2026-09-21): mostrar el **deporte** debajo del nombre del equipo, en pequeño, sin rol visible en la tarjeta. El contrato frontend `TeamSummary` no incluye ese dato; por ahora se muestra **Deporte no disponible**.

Pendiente backend para una tarea futura: definir y exponer el deporte en la lectura agregada de equipos y aportar valores reales. Decidir entonces representación, validación y edición del dato. No se añade schema, endpoint ni valor ficticio en esta iteración. `Comunidad` y `Desarrollo` no se interpretan automáticamente como deportes.

## 4. Identidad global de la persona

Decisión e implementación del primer slice (2026-09-21): la identidad real pertenece a `User`
mediante `firstName` y `lastName`; el alias opcional dentro de un equipo pertenece a
`TeamMembership.displayName`. Las lecturas tenant resuelven alias del equipo, después nombre global
y finalmente `Miembro {id}`. `User.displayName` se conserva solo como campo legado durante la
transición y una migración aditiva copia sus valores existentes a las membresías.

El registro captura nombre y apellidos y no expone el hash. El perfil global consultable/editable
queda separado en #27 y la edición/autorización del alias en #28. El avatar global continúa en #23;
no se añadió una URL o ruta de archivo sin flujo real de storage.

Validación del bloque: `prisma generate`, `prisma validate`, build TypeScript backend,
`npm run seed:check`, lint/TypeScript/build frontend y `git diff --check` correctos. La migración no
se aplicó a una base compartida: se desplegó únicamente sobre la base local aislada
`127.0.0.1:55437/weblogros_ui`. `migrate deploy` aplicó la migración 14/14 y el login real de
Ana/PLAYER más `/equipos/halcones/contexto` pasaron, devolviendo `Ana Fernández` y dos equipos sin
P2022. No se ejecutó seed ni reset. #13 y #20 permanecen abiertas hasta disponer de commit/PR enlazable.

## 5. Seguimiento persistente de la solicitud

El POST de solicitud permite confirmar que el envío terminó correctamente, pero esta ruta no dispone de lectura del estado personal ni una pantalla de detalle pública. El éxito será estado local posterior al POST; al recargar se vuelve al formulario.

Un seguimiento persistente requeriría decisión de producto, autorización y contrato de lectura. No forma parte de UI-A2.

## 6. Notificaciones por email y plazos

El contrato frontend no garantiza emails ni tiempos de revisión. La pantalla de éxito no dirá “te avisaremos por email” ni prometerá un plazo. Solo comunica recepción y revisión pendiente.

Actualización aprobada por el usuario: conservar los tres pasos de la referencia en el estado de éxito: revisión, resolución y acceso condicionado a aprobación. La notificación por email queda pendiente para una tarea futura, sin implementarla ni prometerla en la UI. Los pasos describen el proceso, no un estado de seguimiento consultado al backend.

## 7. Recuperación de contraseña

Categoría: **Producto/backend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/17.

Decidir y definir recuperación de contraseña; omitida deliberadamente en UI-A1. No añadir enlaces sin flujo real.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 8. Recordar sesión

Categoría: **Producto/backend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/18.

Decidir duración y semántica de recordar sesión, coordinada con Auth Hardening; no checkbox decorativo.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 9. Acceso con Google y GitHub

Categoría: **Producto/backend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/19.

Decidir proveedores OAuth y alcance antes de implementar. Ambos botones están excluidos del frontend actual.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 10. Nombre en el registro

Categoría: **Producto/backend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/20.

Completado en el primer slice de identidad: el registro recibe, valida, recorta y persiste
`firstName` y `lastName`, además de email y contraseña. Se usa un único `lastName` para admitir uno
o varios apellidos. El nombre contextual deja de confundirse con estos datos y vive en la membresía.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). Validaciones compartidas con el apartado 4; la
edición posterior queda en #27.

## 11. Términos y privacidad en acceso

Categoría: **Producto/contenido/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/21.

Definir contenido aprobado y destinos reales de términos y privacidad; decidir si se necesita registro de aceptación. No inventar textos legales ni enlaces.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 12. Logos de equipo PNG transparentes

Categoría: **Assets/frontend y contrato por definir**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/22.

Decisión visual del usuario: PNG transparente, sin recuadro, conservando proporción con contain. Iniciales provisionales ya visibles sin rectángulo. Pendiente suministro del logo y contrato de lectura; no presupone uploads ni autoriza assets reales ahora.

Origen: Conversación y TeamsOverview.tsx. La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 13. Imágenes reales, avatares y uploads

Categoría: **Assets/backend/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/23.

Consolidar exclusiones de PLAN y Phase 10: imágenes de logros, avatares, banners/fotografía, uploads/storage. Acordar alcance por tipo antes de implementar; Phase 10 describe imágenes de logros, no autoriza automáticamente todo lo demás. Coordinar logos con su issue específica sin duplicar trabajo.

Origen: PLAN.md y docs/Roadmap.md Phase 10. La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 14. Auth Hardening con cookies HttpOnly

Categoría: **Backend/frontend — roadmap separado**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/24.

Seguimiento de Phase 7.5: migración de sesión JWT desde localStorage a cookie HttpOnly y adaptación backend/frontend. Requiere planificación y validación de seguridad; no se ejecuta por este registro ni pertenece al rediseño actual.

Origen: docs/Roadmap.md Phase 7.5. La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 15. Cerrar QA y convergencia visual de acceso y onboarding

Categoría: **Frontend/QA — no gap backend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/25.

Seguir tareas existentes UI-A1-T04 y UI-A2-T04/T05, no crear una fase paralela. Completar pruebas pendientes de BROWSER-QA.md (preview válido, éxito real, estados alternativos, carreras/doble envío) y comparación visual/tipografía. No fabricar éxito ni datos. Al cerrar sincronizar también STATUS/TASKS según sus gates.

Origen: UI-A1 y UI-A2/BROWSER-QA.md; UI-A2/COMPARISON-COORDINATOR-1.md. La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 16. Perfil global editable

Categoría: **Producto/backend/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/27.

Pendiente: lectura autenticada del perfil propio, edición validada de nombre y apellidos y su
formulario. No incluye cambio de email, contraseña ni avatar.

## 17. Alias editable por equipo

Categoría: **Producto/backend/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/28.

Pendiente: decidir si el alias puede cambiarlo el propio miembro, el `TEAM_ADMIN` o ambos;
implementar después una escritura tenant-scoped con aislamiento y autorización contextual. El alias
no requiere unicidad en la decisión vigente.

## 18. Logros secretos

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/29.

Detectado el 2026-09-21 al revisar «Mi progreso personal». `Logro` no dispone de visibilidad secreta ni reglas de revelado. Definir qué información se oculta, quién puede verla, cuándo se desbloquea y cómo afecta a catálogo, detalle y agregados. Evitar filtraciones mediante APIs, búsquedas o conteos. Decidir si los secretos forman parte del denominador de progreso y su relación con los estados de obtención.

Provisional: el frontend no muestra un conteo de secretos inventado. Registro solicitado, no autorización para implementar. Al resolver, actualizar apartado y tabla a COMPLETADO con PR/commit y validaciones, y sincronizar Roadmap.

## 19. Progreso parcial de logros por jugador

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/30.

Detectado el 2026-09-21: `criterios` contiene texto y `UserLogro` registra obtención final, pero no existe avance persistente por jugador (p. ej. 2 de 3). Definir objetivo/avance o checklist, permisos para registrar y validar, correcciones, cambios de criterios y transición a obtención sin duplicar concesiones. Probar estados sin iniciar/parcial/completado, concurrencia y aislamiento tenant.

No confundir una solicitud PENDING con un logro en progreso. Actualmente «Pendientes» en el panel personal significa catálogo menos conseguidos, no logros empezados; preferir «Sin conseguir» al refinar ese texto. No usar estados ficticios para rellenar el gráfico. Al resolver, actualizar apartado y tabla a COMPLETADO con PR/commit y validaciones, y sincronizar Roadmap.

## 20. Etiquetas personalizables de jugadores

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/31.

Solicitado el 2026-09-21 durante la revisión del ranking: etiquetas personalizables que el administrador del equipo puede conceder a jugadores. Catálogo y asignaciones scoped al equipo; no son roles, permisos ni logros, ni modifican puntuaciones o posiciones.

Definir nombre/descripción, opciones visuales (colores/iconos), límites, visibilidad, gestión del catálogo, asignación/retirada y comportamiento al editar o eliminar etiquetas. Acordar multiplicidad, orden e historial/caducidad antes de implementarlos. Decidir su presentación en ranking, jugadores y perfil. No incluye uploads implícitos.

Validar autorización contextual de TEAM_ADMIN, duplicados y aislamiento entre equipos. Al resolver, actualizar este apartado y su fila a COMPLETADO con PR/commit y validaciones, y sincronizar Roadmap en el mismo cambio. Backlog futuro, sin implementación autorizada en el workstream actual.

## Soporte suficiente de acceso y onboarding (existente)

- Preview de invitación: equipo, caducidad y usos restantes.
- Unión: operación autenticada y equipo resultante.
- Solicitud: nombre, email oficial y mensaje.
- Selección de equipos: membresías y rol contextual.

No hay gap que justifique modificar backend para completar UI-A2.
