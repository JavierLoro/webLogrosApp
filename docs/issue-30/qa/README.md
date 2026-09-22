# QA #30 / #29

Preparación independiente. No aprobación visual ni cierre de issues.

## HTTP

Desde la raíz, después de aplicar la migración y confirmar que el backend usa la base de revisión:

```powershell
node --env-file=apps/backend/.env.ui-windows docs/issue-30/qa/http.cjs
```

El script exige PostgreSQL local `55437/weblogros_ui`. Crea dos equipos y tres usuarios con prefijo único `qa30-<timestamp>`, autentica mediante login real, ejecuta contratos y limpia exclusivamente sus IDs en `finally`. No imprime cookies ni contraseñas. Guarda rutas, roles, estados esperados/reales, aserciones y resultado de limpieza en `http-results.json`. Compara conteos de Halcones/Lobos antes y después. No ejecuta migraciones ni seed.

Cobertura preparada: permisos, otro tenant, configuración secreta, tipo inmutable, 12 incrementos simultáneos, límites inferior/superior, elegibilidad sin concesión automática, concesión explícita, censura de catálogo/detalle/búsqueda/historial/agregados, revelado global a otro miembro y aislamiento por temporada.

Decisiones confirmadas: enteros, objetivo obligatorio antes de conceder, contador cerrado tras concesión. El script prueba rechazo de decimales, concesión directa y aprobación anticipadas (409), delta tras concesión (409), carrera corrección/concesión y unicidad de concesiones concurrentes. HTTP y navegador ejecutados PASS; ver RESULT.md. `node --check` PASS para ambos scripts.

Para capturar antes de limpiar el fixture: definir `$env:QA_BROWSER = '1'` antes del mismo comando. El hook `capture.cjs` reutiliza las cookies de login solo en memoria y guarda PNGs en `screenshots/` y telemetría en `browser-results.json`; no guarda credenciales ni storageState. Elimina la variable al terminar.

## Captura prevista

Rutas: catálogo, detalle progresivo/oculto, creación administrativa, administración del avance y dashboard. Roles PLAYER y TEAM_ADMIN. Viewports desktop 1440×1024 y móvil 390×844; locale es-ES, Europe/Madrid. Datos de QA persistidos en el mismo tenant aislado; registrar IDs y estado exacto de cada captura. Comprobar overflow y errores de consola/red. El Coordinator realiza la comparación visual.

Playwright disponible desde `C:/Users/javie/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright`, mediante CommonJS. La versión instalada espera Chromium1234 pero el caché contiene1243: ejecución usa Chrome existente `C:/Program Files/Google/Chrome/Application/chrome.exe`, sin instalaciones. El sandbox bloqueó spawn con EPERM; ejecución elevada aprobada automáticamente.
