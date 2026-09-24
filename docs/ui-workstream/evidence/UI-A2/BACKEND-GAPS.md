# Frontend deseado — Registro unificado de pendientes

Registro unificado de gaps backend, decisiones de producto, assets/frontend y QA detectados durante acceso/onboarding (UI-A1/UI-A2) y refinamientos del dashboard. Se conserva la ruta histórica BACKEND-GAPS.md, aunque no todos los puntos sean backend. Incluye referencias a trabajo separado del roadmap, no todo el roadmap como cola de ejecución. No propone endpoints como hechos ni autoriza implementación.

Actualización documental: **2026-09-22**. «COMPLETADO EN REPOSITORIO LOCAL» indica implementación versionada y validación local documentada del alcance señalado; no implica despliegue, publicación remota ni cierre de la issue. «PARCIAL» mantiene explícitas las pruebas y pantallas pendientes. La conciliación usa Roadmap, STATUS, apuntes y el commit local `c2ca920`; no vuelve a ejecutar las validaciones históricas.

## Seguimiento en GitHub

Etiquetas de clasificación (no equivalen a aprobación ni estado de ejecución):

- `gap`: falta de datos o soporte para el frontend deseado — #10, #12, #13 y #22.
- `funcionalidad deseada`: clasificación de origen, no estado de entrega — #11, #14, #15, #17, #18, #19, #20, #21, #23, #24, #27, #28, #29, #30 y #31.
- `qa`: pruebas y convergencia visual, no nueva funcionalidad — #25.

Al incorporar nuevos puntos o cambiar su alcance, mantener coherentes las etiquetas y este registro.

Al resolver una issue, actualizar **en el mismo cambio** tanto su apartado de este documento como la fila siguiente: marcar **COMPLETADO**, describir el resultado y enlazar la PR/commit y las validaciones. No cerrar la issue dejando este documento desactualizado. Si se descarta o aplaza, registrar **DESCARTADO** o **APLAZADO** con el motivo, sin confundirlo con una implementación completada. Los nuevos gaps deben enlazarse con su issue sin duplicados y conservar la distinción entre requisito aprobado y decisión pendiente.

| Apartado | Issue | Estado | Alcance |
| --- | --- | --- | --- |
| 1. Estadísticas | [#10](https://github.com/JavierLoro/webLogrosApp/issues/10) | COMPLETADO | PR #26; logros y jugadores reales |
| 2. Temporada | [#11](https://github.com/JavierLoro/webLogrosApp/issues/11) | PARCIAL — migración local e integración verificadas | Phase 7.9; gestión visual, selector histórico y QA restante pendientes |
| 3. Deporte | [#12](https://github.com/JavierLoro/webLogrosApp/issues/12) | PENDIENTE | Presentación solicitada; diseño backend pendiente |
| 4. Identidad global | [#13](https://github.com/JavierLoro/webLogrosApp/issues/13) | COMPLETADO EN REPOSITORIO LOCAL | c2ca920; nombre/apellidos y alias tenant; edición separada en #27/#28 |
| 5. Seguimiento de solicitudes | [#14](https://github.com/JavierLoro/webLogrosApp/issues/14) | PENDIENTE DE DECISIÓN | Producto, permisos y lectura por acordar |
| 6. Email y plazos | [#15](https://github.com/JavierLoro/webLogrosApp/issues/15) | PENDIENTE DE DECISIÓN | Sin garantías ni promesas actuales |
| 7. Recuperación de contraseña | [#17](https://github.com/JavierLoro/webLogrosApp/issues/17) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 8. Recordar sesión | [#18](https://github.com/JavierLoro/webLogrosApp/issues/18) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 9. Acceso con Google y GitHub | [#19](https://github.com/JavierLoro/webLogrosApp/issues/19) | PENDIENTE DE DEFINICIÓN | Producto/backend |
| 10. Nombre en el registro | [#20](https://github.com/JavierLoro/webLogrosApp/issues/20) | COMPLETADO EN REPOSITORIO LOCAL | c2ca920; registro persiste nombre y apellidos globales |
| 11. Términos y privacidad en acceso | [#21](https://github.com/JavierLoro/webLogrosApp/issues/21) | PENDIENTE DE DEFINICIÓN | Producto/contenido/frontend |
| 12. Logos de equipo PNG transparentes | [#22](https://github.com/JavierLoro/webLogrosApp/issues/22) | PENDIENTE — visual, alcance y lectura acordados | 7.10: logos visibles para cualquier usuario autenticado; SeaweedFS elegido; edición por TEAM_ADMIN acordada, implementación pendiente |
| 13. Imágenes reales, avatares y uploads | [#23](https://github.com/JavierLoro/webLogrosApp/issues/23) | PLAN DEFINIDO — implementación pendiente | Phase 7.10: tareas y decisiones de uso locales acordadas; diseño técnico pendiente, sin implementación ni cierre de la issue |
| 14. Auth Hardening con cookies HttpOnly | [#24](https://github.com/JavierLoro/webLogrosApp/issues/24) | COMPLETADO EN REPOSITORIO LOCAL | c2ca920; Phase 7.5 y QA manual del 22/09 completadas |
| 15. Cerrar QA y convergencia visual de acceso y onboarding | [#25](https://github.com/JavierLoro/webLogrosApp/issues/25) | EN CURSO — gate pendiente | Frontend/QA — no gap backend |
| 16. Perfil global editable | [#27](https://github.com/JavierLoro/webLogrosApp/issues/27) | PENDIENTE | Consulta/edición autenticada y formulario |
| 17. Alias editable por equipo | [#28](https://github.com/JavierLoro/webLogrosApp/issues/28) | PENDIENTE DE DECISIÓN | Permisos y edición tenant-scoped |
| 18. Logros secretos | [#29](https://github.com/JavierLoro/webLogrosApp/issues/29) | COMPLETADO LOCALMENTE | Censura y revelado global; entrega conjunta #30, [evidencia](../../../issue-30/RESULT.md) |
| 19. Progreso parcial por jugador | [#30](https://github.com/JavierLoro/webLogrosApp/issues/30) | COMPLETADO LOCALMENTE | Contador entero atómico, objetivo obligatorio y cierre tras concesión; [evidencia](../../../issue-30/RESULT.md) |
| 20. Etiquetas personalizables de jugadores | [#31](https://github.com/JavierLoro/webLogrosApp/issues/31) | PENDIENTE DE DEFINICIÓN | Catálogo por equipo y concesión por TEAM_ADMIN |
| 21. Conservación del jugador y baja del equipo | Sin issue asignada; seguimiento documental | REQUISITO ACORDADO — implementación pendiente | Archivar conserva ficha/avatar y permite recuperación; eliminar retira datos actuales/avatar, cancela solicitudes pendientes y conserva resultados cerrados con alias/iniciales. Reingreso tras eliminación empieza de nuevo |

Estas issues registran seguimiento, no autorizan implementación ni amplían UI-A2. La tabla describe el repositorio local; el estado remoto de issues/publicación no se ha comprobado ni modificado en esta actualización. Publicar este registro junto con los cambios correspondientes para mantener coherencia en GitHub.

## 1. Estadísticas de las cards de equipo



### Decisión funcional

- **Logros** cuenta todos los logros del catálogo del equipo.
- **Jugadores** cuenta exclusivamente las membresías con rol `PLAYER`.
- Una membresía `TEAM_ADMIN` no cuenta como jugador con el modelo actual. La propuesta para
  permitir ambos roles se sigue separadamente en [#16](https://github.com/JavierLoro/webLogrosApp/issues/16).
- Estas estadísticas no incorporan temporadas; su desarrollo posterior se sigue en el apartado 2 y Phase 7.9.

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

**PARCIAL — migración local e integración verificadas.** El dominio se incorporó en Phase 7.9, commit local `c2ca920`. La entrega `e50e2e3` de #30/#29 confirma la migración aplicada y pruebas de progreso/concesiones estacionales, revelado entre temporadas y aprobación histórica. [Validaciones y límites](../../../issue-30/qa/RESULT.md); no acredita despliegue ni cierre de #11.

Roadmap y Architecture registran temporadas por equipo, logros permanentes/estacionales, contexto de temporada en solicitudes y concesiones, ranking histórico y API de gestión. Los conceptos están documentados en `docs/apuntes.md`, sección «Temporadas — catálogo reutilizable e historial por periodo».

Pendiente en **#11**, sin duplicar issue: concretar navegación/diseño de la gestión visual, conectar listar/crear/activar/cerrar temporadas y selector de ranking histórico, y completar QA de gestión, permisos, estados y aislamiento aún no cubiertos. Coordinar la entrada administrativa con UI-G8. Elegir alcance estacional al crear un logro ya es funcional, pero no sustituye estas pantallas. UI-A2 sigue omitiendo el dato hasta disponer de su integración real; no mostrar una temporada copiada de la referencia.

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
queda separado en #27 y la edición/autorización del alias en #28. El avatar continúa en #23: general y foto opcional por equipo, según decisión del 2026-09-22;
no se añadió una URL o ruta de archivo sin flujo real de storage.

Validación del bloque: `prisma generate`, `prisma validate`, build TypeScript backend,
`npm run seed:check`, lint/TypeScript/build frontend y `git diff --check` correctos. La migración no
se aplicó a una base compartida: se desplegó únicamente sobre la base local aislada
`127.0.0.1:55437/weblogros_ui`. `migrate deploy` aplicó la migración 14/14 y el login real de
Ana/PLAYER más `/equipos/halcones/contexto` pasaron, devolviendo `Ana Fernández` y dos equipos sin
P2022. No se ejecutó seed ni reset. Este resultado corresponde al bloque de identidad; no valida la migración posterior de temporadas.

**COMPLETADO EN REPOSITORIO LOCAL** para este alcance y el registro de #20: incluido en [c2ca920](https://github.com/JavierLoro/webLogrosApp/commit/c2ca9207f34682b921b40f8e7beeefec554a7e12), presente en `main` local. La publicación remota y el cierre de #13/#20 no se han verificado. Perfil editable, edición de alias y avatar continúan pendientes en sus propias issues.

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

**COMPLETADO EN REPOSITORIO LOCAL.** Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). Commit `c2ca920` y validaciones enlazados en el apartado 4; publicación/cierre remoto no verificados. La edición posterior queda en #27.

## 11. Términos y privacidad en acceso

Categoría: **Producto/contenido/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/21.

Definir contenido aprobado y destinos reales de términos y privacidad; decidir si se necesita registro de aceptación. No inventar textos legales ni enlaces.

Origen: [Análisis UI-A1](../UI-A1/ANALYSIS.md). La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 12. Logos de equipo PNG transparentes

Categoría: **Assets/frontend y contrato por definir**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/22.

Decisión visual del usuario: PNG transparente, sin recuadro, conservando proporción con contain. Iniciales provisionales ya visibles sin rectángulo. Pendiente suministro del logo y contrato de lectura; no presupone uploads ni autoriza assets reales ahora.

2026-09-22: [MEDIA-PLAN](../../../MEDIA-PLAN.md), D01 acordada: logos incluidos en Phase 7.10 junto con logros y avatares. D02 elige SeaweedFS en servidor propio y R2 como destino futuro preferido. D03 acuerda lectura del logo por cualquier usuario autenticado de la plataforma, sin membresía ni invitación; subida, cambio y retirada por TEAM_ADMIN del equipo acordados. No concede acceso anónimo ni acceso a otros datos privados del equipo. La presentación acordada se conserva. No hay subida ni almacenamiento implementados por estas decisiones.

Origen: Conversación y TeamsOverview.tsx. La tabla conserva el estado; registrar aquí resolución y evidencia al cerrar.

## 13. Imágenes reales, avatares y uploads

Categoría: **Assets/backend/frontend**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/23.

Aplicar las exclusiones visuales hasta definir controles y excepción por pantalla en Phase 7.10: logros, logos y avatares son su alcance acordado. Phase 10 queda para propuestas y otros archivos/usos futuros, sin integrar banners/fotografía por inferencia. Coordinar logos con su issue específica sin duplicar trabajo.

2026-09-22: [MEDIA-PLAN](../../../MEDIA-PLAN.md) define decisiones D01–D07 y tareas T00–T09 para el bloque adelantado 7.10. D01 acordada: imágenes de catálogo, logos de #22, avatar general y foto opcional por equipo; empezar por el recorrido completo de un logro. Prioridad de avatar: equipo → general → iniciales; fuera de equipo general → iniciales. Cambiar la general actualiza solo contextos que la heredan; cambiar una específica no afecta a otros equipos. D02 elige SeaweedFS con R2 como destino futuro; D03 acuerda logos y avatar general visibles para cualquier usuario autenticado, y avatar específico solo para miembros de su equipo. Edición acordada: cada persona gestiona sus avatares y TEAM_ADMIN gestiona logo/logros de su equipo, sin editar avatares ajenos. Entrega/caché/revocación y resto de decisiones operativas pendientes. Subida, reemplazo/retirada, persistencia y restauración sin implementar. Imágenes de propuestas, banners y otros tipos quedan fuera del primer bloque salvo acuerdo específico. La entrega local para QA se distingue del despliegue y las copias externas de producción. No implica completar toda #23 ni ampliar la edición de otros campos de perfil/alias.

Seguimiento vigente: PLAN.md y Roadmap Phase 7.10; Phase 10 conserva ampliaciones futuras. Registrar aquí implementación y evidencia al cerrar.

## 14. Auth Hardening con cookies HttpOnly

Categoría: **Backend/frontend — roadmap separado**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/24.

**COMPLETADO EN REPOSITORIO LOCAL.** Phase 7.5 está implementada en [c2ca920](https://github.com/JavierLoro/webLogrosApp/commit/c2ca9207f34682b921b40f8e7beeefec554a7e12) (publicación remota no verificada): JWT en cookie HttpOnly, lectura de sesión y cierre de sesión en servidor, frontend sin almacenamiento manual del token ni envío Bearer.

Validación documentada el 2026-09-22 en [STATUS](../../STATUS.md), [Roadmap](../../../Roadmap.md) y `apuntes.md` («Cookies HttpOnly y ciclo de sesión»): login, persistencia tras recarga, acceso protegido y logout PASS; TypeScript, lint y build backend PASS según STATUS. No se repiten esas pruebas en esta conciliación. Es trabajo separado del rediseño; no cierra los gates de UI-A1/UI-A2 ni acredita despliegue en producción. Estado remoto de #24 sin verificar.

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

Continuación visual: UI-G8-T05/T06/T07 incorporarán los controles y la política existentes en las subrutas definitivas; T08 comprobará censura, revelado y regresión. Es trabajo de rediseño pendiente en tareas existentes, no una nueva carencia backend ni reapertura de #29. [Alcance UI-G8](../../PLAN.md#ui-g8--team-admin).

**2026-09-22 — COMPLETADO LOCALMENTE.** Propiedad editable por TEAM_ADMIN; censura en backend hasta la primera concesión histórica del equipo; revelado global que sobrevive a temporadas; progreso parcial no revela y secretos ocultos fuera del denominador personal. Incluye textos duplicados de solicitudes/propuestas, catálogo, detalle y agregados. Entrega conjunta con #30.

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/29.

[Entrega, versión y validaciones](../../../issue-30/RESULT.md): migración local16/16, builds/lint, 7 unitarias, 103 HTTP, flujo navegador y 26 capturas PASS. Publicación, despliegue y cierre remoto no realizados. El diagnóstico original del 21/09 queda resuelto en este alcance.

## 19. Progreso parcial de logros por jugador

Continuación visual: UI-G8-T05 integra el registro/corrección de avance y concesión; T06/T07 adaptan revisión de solicitudes/propuestas; T08 verifica todos los estados y bloqueo tras concesión junto a catálogo/detalle/dashboard. #30 ya incluye frontend funcional; la gestión de temporadas/históricos continúa separadamente en #11. [Alcance UI-G8](../../PLAN.md#ui-g8--team-admin).

**2026-09-22 — COMPLETADO LOCALMENTE.** Tipo STANDARD/PROGRESSIVE independiente de secreto/alcance, objetivo en Logro, avance por persona/contexto estacional y deltas atómicos limitados. TEAM_ADMIN registra/corrige; alcanzar objetivo no crea UserLogro. Contadores enteros, objetivo obligatorio antes de conceder y contador cerrado tras concesión según confirmación del usuario. UI y pruebas conjuntas con #29 incluidas.

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/30.

Estados derivados distinguen sin empezar, en progreso, objetivo alcanzado pendiente de concesión y conseguido. Una solicitud PENDING no cuenta como avance. Validada también la aprobación histórica en la temporada guardada en la solicitud. [Entrega, versión y validaciones](../../../issue-30/RESULT.md); publicación/cierre remoto conjunto pendientes. No se implementa edición de tipo/objetivo después de crear.

## 20. Etiquetas personalizables de jugadores

Categoría: **Producto/backend/frontend — funcionalidad deseada**. Issue: https://github.com/JavierLoro/webLogrosApp/issues/31.

Solicitado el 2026-09-21 durante la revisión del ranking: etiquetas personalizables que el administrador del equipo puede conceder a jugadores. Catálogo y asignaciones scoped al equipo; no son roles, permisos ni logros, ni modifican puntuaciones o posiciones.

Definir nombre/descripción, opciones visuales (colores/iconos), límites, visibilidad, gestión del catálogo, asignación/retirada y comportamiento al editar o eliminar etiquetas. Acordar multiplicidad, orden e historial/caducidad antes de implementarlos. Decidir su presentación en ranking, jugadores y perfil. No incluye uploads implícitos.

Validar autorización contextual de TEAM_ADMIN, duplicados y aislamiento entre equipos. Al resolver, actualizar este apartado y su fila a COMPLETADO con PR/commit y validaciones, y sincronizar Roadmap en el mismo cambio. Backlog futuro, sin implementación autorizada en el workstream actual.

## 21. Conservación del jugador y baja del equipo

**Planificación por tareas, 2026-09-24:** [PLAYER-LIFECYCLE-PLAN](../../../PLAYER-LIFECYCLE-PLAN.md). PLAYER-LC-T00 documental DONE; T01–T07 TODO. Diseño T01 precede a MEDIA-10A-T03.02; archivo/reingreso T03 precede a avatar específico T05.08; eliminación T04 usa limpieza T05.06 y avatares T05.08. Interfaz T05 aplazada a nuevas pestañas/UI-G8. Registro local, sin issue remota asignada, implementación ni cierre de gates. Relación general en [Roadmap](../../../Roadmap.md#bloque-vinculado-a-7879--ciclo-de-vida-del-jugador-gap-21).

**2026-09-23 — Requisito acordado, sin implementación.** El usuario pide conservar los datos del jugador en el equipo para mantener logros obtenidos y rankings, salvo eliminación explícita por el administrador. Retirar acceso no elimina ficha contextual, progreso, concesiones, alias/avatar ni vínculos históricos; el reingreso de la misma cuenta recupera el historial sin duplicados salvo eliminación explícita anterior. Distinguir miembros activos de registros conservados tanto en autorización como en contadores/listados.

Comprobación de solo lectura: `TeamMembership` mantiene relación única persona + equipo, rol, alias y fecha de unión, pero no un estado activo/inactivo. Hace falta diseñar la separación de acceso e historial y revisar consultas/autorización. No se acredita todavía el comportamiento de salida ni se han ejecutado pruebas nuevas del backend. El detalle visual de antiguos miembros/filtros se coordinará con las nuevas pestañas.

La excepción de eliminación por TEAM_ADMIN es exclusiva de su equipo; no elimina la cuenta global ni datos de otros equipos. **Acordado el 2026-09-23:** conservar resultados de temporadas cerradas aunque el administrador elimine al jugador; preservar concesiones/puntos, puestos y referencias necesarias, incluidas las aportaciones permanentes que use ese ranking. No retirar al jugador del resultado histórico ni desplazar a otros por su eliminación. Temporada activa y datos actuales se conservan al salir o perder acceso; solo una acción explícita de TEAM_ADMIN puede eliminarlos de su equipo, respetando las referencias de resultados cerrados.

**Aceptadas las dos acciones («me gusta si, nos quedamos con esto»):** Archivar retira acceso y listado habitual, conserva ficha/avatar/resultados entre antiguos jugadores y permite recuperar la ficha al volver. Eliminar del equipo exige confirmación explicando pérdidas y no ofrece deshacer: retira datos actuales salvo lo necesario para históricos cerrados, borra avatar específico y variantes sin referencias vigentes y cancela solicitudes pendientes. Mantiene decisiones resueltas y logros del catálogo nacidos de propuestas del jugador. Resultados cerrados muestran último alias del equipo e iniciales, sin heredar avatar general. Si vuelve tras eliminación empieza de nuevo, sin recuperar progreso eliminado; resultados cerrados anteriores se conservan. No borrar avatar general ni fotos/datos de otros equipos. Producto acordado, diseño técnico y ubicación de controles pendientes. No asumir cascadas destructivas. Ver matriz en [Architecture](../../../Architecture.md) y dependencia en [MEDIA-PLAN](../../../MEDIA-PLAN.md): media no absorbe automáticamente este alcance. No se crea issue remota ni se cambia el gate UI-A2.

Validación futura: comprobar que salir o archivar conserva datos/resultados/avatar sin mantener permisos, y reingresar los recupera sin duplicados. Eliminar explícitamente al jugador y verificar confirmación, retirada de datos actuales/avatar específico, solicitudes pendientes canceladas y conservación de decisiones resueltas y logros del catálogo procedentes de sus propuestas. Verificar fila histórica con último alias/iniciales, puntos y puestos de todos intactos, incluidas aportaciones de logros permanentes. Reingreso tras eliminación empieza de nuevo sin restaurar progreso eliminado ni modificar identidad/resultados cerrados conservados. Comprobar autorización contextual, cuenta/avatar general y otros equipos intactos, y ausencia de referencias rotas o borrado de fotos vigentes. Pruebas pendientes, no ejecutadas en esta revisión documental.

## Soporte suficiente de acceso y onboarding (existente)

- Preview de invitación: equipo, caducidad y usos restantes.
- Unión: operación autenticada y equipo resultante.
- Solicitud: nombre, email oficial y mensaje.
- Selección de equipos: membresías y rol contextual.

No hay gap que justifique modificar backend para completar UI-A2.
