# UI-A1 — QA de navegador, iteración 0

Fecha: 2026-09-20. Coordinator ejecuta captura porque IAB no está disponible en el worker QA. UI controlada exclusivamente mediante cua_repl/IAB, tab 1. Implementador independiente: frontend_worker. Capturas reales, no mock HTML.

## Corrección de evidencia tras crítica independiente

`login-mobile.png` y `register-error-mobile.png` resultaron lienzos incompletos durante transición. **No son capturas visuales válidas**, aunque las observaciones DOM/AX sí verificaron estados y anchos. Deben sustituirse por capturas de iteración 1 abiertas y verificadas antes de cerrar el gate. El PASS técnico de QA.md no supone validez visual de esos dos PNG.

## Evidencia

- `login-desktop.png`, `register-desktop.png`: viewport 1440 × 1024, full-page, formulario vacío.
- `login-mobile.png`, `register-mobile.png`: viewport 390 × 844, full-page, formulario vacío.
- `login-tablet.png`, `register-tablet.png`: viewport 768 × 1024, full-page.
- `register-error-mobile.png`: contraseñas distintas.
- `login-error-tablet.png`: credenciales incorrectas reales.

La lámina canónica contiene seis pantallas reducidas, no un viewport único de la aplicación. Critic debe comparar solo interiores 1/2 y registrar normalización; no afirmar pixel match de la lámina entera. Fotografía excluida por contrato del usuario.

## Resultados observados

- Login desktop: ancho viewport/documento 1440/1440. Inputs 48 px de alto, 383 px de ancho. Título ocupa dos líneas (73.44 px de alto); evaluar fidelidad en crítica.
- Login móvil: viewport/client/scroll 390/390/390; altura documento 844.
- Registro móvil vacío: viewport/scroll 390/390; altura documento 844. Error añade desplazamiento vertical con client/scroll 375/375 (scrollbar), no overflow horizontal.
- Ambas rutas tablet: viewport/client/scroll 768/768/768.
- Navegación Regístrate → /register e Inicia sesión → /login: PASS.
- Registro vacío: validación nativa required; foco en email. Los tres campos declaran valueMissing.
- Registro con contraseñas distintas: alerta «Las contraseñas no coinciden.» y permanece en registro. Ausencia de POST respaldada por retorno del handler en código, no por instrumentación de red.
- Mostrar/Ocultar: password pasa a text y vuelve a password; confirmación permanece independiente, nombre accesible/aria-pressed cambian. Solo se usaron valores ficticios y no se guardó captura con contraseña visible.
- Email inválido: typeMismatch y mensaje nativo; no se confunde con error de servidor.
- Login Ana con contraseña incorrecta: alerta «Credenciales incorrectas», campos conservados y botón vuelve a disponible.
- Login real Ana: /equipos, enlaces PLAYER Halcones y Lobos. Header público sigue presente en /equipos.
- Login real Diego: /equipos/halcones, navegación Administración visible y datos 12 miembros/14 catálogo/40 otorgados/4280 puntos. No se cambió TeamShell.
- Se cerraron ambas sesiones de prueba mediante botones existentes; navegador termina en /login y viewport override restablecido.
- Consola consultada: sin error JS observado; advertencia de Next por scroll-behavior smooth en html, fuera de archivos modificados.

## Límites explícitos

- No se creó una cuenta ni se probó éxito de registro para no modificar el fixture. Se preserva el contrato existente `{ email, password }` y redirect /login por inspección.
- Prevención de doble envío verificada estructuralmente con ref síncrona, no se midió número de POST en carrera runtime.
- No se simularon caída de red ni respuestas 500. Error real de credenciales sí ejecutado.
- La aprobación visual corresponde al critic; este informe no declara convergencia.
