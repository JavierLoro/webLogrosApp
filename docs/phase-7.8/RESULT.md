# Perfil global y alias propios — entrega local

2026-09-24. #27 y #28 completados localmente en el alcance aprobado. Sin commit, publicación, despliegue ni cierre remoto de issues.

## Resultado

Una pantalla `/perfil`, accesible desde las acciones de cuenta y la navegación del equipo en desktop/móvil. Permite editar nombre/apellidos y consultar correo. Cada equipo tiene su formulario independiente de alias; dejarlo vacío recupera el nombre global. Guardar un bloque no pierde borradores de otro. Errores conservan los campos y permiten reintento; sesión caducada ofrece login.

Cada persona edita exclusivamente sus datos: PLAYER y TEAM_ADMIN tienen el mismo permiso propio. No hay edición de alias ajenos, correo, contraseña, avatar ni eliminación de cuenta.

Backend: `GET /auth/profile`, `PATCH /auth/profile`, `PATCH /equipos/:slug/mi-alias`. Identidad desde sesión, pertenencia actual, campos permitidos explícitos, nombres trim 1–80/1–120 y alias hasta 80; vacío/null normalizado a null. [Contrato y decisiones](BACKEND.md), [frontend](FRONTEND.md), [plan aprobado](PLAN.md).

## Validación

- Backend build PASS; frontend ESLint dirigido, TypeScript y build de producción PASS. Build reconoce `/perfil`; el HTML inicial no contiene datos privados, cargados mediante API autenticada.
- [28 peticiones HTTP y checks](qa/http-results-qa78-1790259932325.json): 401/403/404, límites, normalización, rechazo de campos extra, DTO sin secretos, independencia de nombres/alias/equipos/usuarios y permisos propios TEAM_ADMIN.
- [Siete recorridos de navegador](qa/browser-results.json): un PATCH ante doble envío, persistencia, borrador de otro alias intacto, borrado con fallback al volver al equipo, enlaces de entrada móvil, error 500 con reintento, administrador, cuenta sin equipos y anónimo.
- Seis capturas a 1440/390, sin overflow global ni pageerrors. Coordinator inspeccionó directamente PLAYER desktop/móvil: jerarquía clara, formularios legibles, controles accesibles y composición de dos columnas que apila en móvil. Sin defectos materiales observados.
- Fixtures temporales propios eliminados; snapshot de identidades/membresías compartidas sin cambios. No seed, reset, migración ni modificación de la base principal. [QA y runtime](qa/QA.md).

La revisión visual corresponde a una ampliación funcional: no existe referencia canónica específica de `/perfil`. Reutiliza lenguaje visual, tokens y cabecera existentes; no acredita nuevos gates de UI Workstream V2 ni fidelidad a un mockup inexistente. La variante SUPER_ADMIN y todas las combinaciones posibles de fallos no tienen cobertura exhaustiva.

## Pendientes de 7.8

`User.displayName` fue retirado posteriormente el mismo día mediante migración protegida y comprobación de conservación; [entrega de limpieza](LEGACY-CLEANUP.md). Los avatares siguen en 7.10/#23. El ciclo de vida de jugadores conserva su plan separado. La pausa de A1/A2/G9 no cambia.

Explicación pedagógica y decisiones registradas en [apuntes](../apuntes.md), sección «Perfil global y alias propios — Phase 7.8».
