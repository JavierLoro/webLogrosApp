# Perfil global y alias propios — Phase 7.8

Estado: ENTREGADO LOCALMENTE. [Resultado y validación](RESULT.md).

2026-09-24. Implementación autorizada por el usuario: «dale, encargate», tras aprobar una pantalla `/perfil` con dos bloques. Trabajo funcional independiente de la pausa general de UI Workstream V2; no reanuda A1/A2/G9.

## Alcance

- Consultar/editar nombre y apellidos globales; correo solo consulta.
- Consultar equipos y editar únicamente el alias propio de cada membresía; alias vacío elimina la personalización y recupera el nombre global.
- Una pantalla `/perfil`, accesible desde las acciones de cuenta y el espacio tenant. Reutilizar componentes, lenguaje visual y tokens existentes; sin rediseñar el shell.
- Permiso acordado: PLAYER y TEAM_ADMIN editan sus propios datos. No se otorga a administradores permiso para editar alias de otros miembros.
- Sin avatares, correo editable, contraseña o eliminación de cuenta. Sin cambios de roles ni ciclo de vida de jugadores.

## Contrato

`GET /auth/profile` y `PATCH /auth/profile` devuelven `id`, `email`, `firstName`, `lastName` y `memberships` con `team: {slug, nombre}`, `role` y `displayName`.

`PATCH /auth/profile` acepta exclusivamente `firstName` y `lastName`, ambos obligatorios (trim; límites 80/120). `PATCH /equipos/:slug/mi-alias` acepta exclusivamente `displayName` (null o texto hasta 80; vacío normalizado a null), y devuelve ese campo.

El usuario procede de la sesión, nunca de un ID del formulario. La edición del alias exige pertenencia actual al equipo. Validar campos permitidos impide modificaciones accidentales de correo, roles o identidad ajena.

## Cierre

Build/lint/TypeScript, pruebas HTTP de permisos/validación/aislamiento y recorridos en navegador. Comprobar persistencia, alias independiente por equipo, borrado y fallback, nombres actualizados al volver al equipo, errores y móvil. Fixtures propios temporales, sin reset/seed.

Auditar consumidores de `User.displayName` antes de retirarlo. Su eliminación exige una migración compatible y evidencia de conservación de datos; no darla por realizada por añadir el formulario.

Coordinator mantiene documentación y comparación visual; workers implementan backend/frontend y QA por responsabilidades separadas.
