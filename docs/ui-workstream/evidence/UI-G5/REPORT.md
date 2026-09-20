# UI-G5-T03 — Capture y QA del ranking

Fecha: 2026-09-20  
Ruta: `/equipos/halcones/ranking`  
Fixture: Halcones determinista de UI-G1  
Resultado técnico: **CAPTURE COMPLETADA / ITERATE por dos métricas del contrato**

Este informe documenta el build correspondiente a UI-G5-T02 antes de cualquier corrección posterior. No declara el gate visual; la crítica independiente se registra por separado.

## Entorno y reemplazo supervisado

- Skill aplicada: `weblogros-entorno-seguro`.
- Preflight: `.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build` — PASS.
- Memoria disponible: 7175 MiB de 8192 MiB.
- Swap: 89% utilizada, 54 MiB libres; warning no bloqueante.
- Frontend anterior: PID `665035`, sesión `25296`, cwd `/tmp/weblogros-ui-review-g3/repo/apps/frontend`; identidad verificada antes de detenerlo.
- Se copiaron exclusivamente:
  - `apps/frontend/src/app/equipos/[slug]/ranking/page.tsx`;
  - `apps/frontend/src/app/components/ranking/TeamRankingView.tsx`;
  - `apps/frontend/src/types/api.ts`.
- Build Next.js 16.2.0: PASS.
- Frontend capturado: PID `689502`, sesión `9810`, `0.0.0.0:3000`.
- Backend conservado: PID `620960`, sesión `88569`, health 200.
- PostgreSQL conservado: `weblogros_ui_review_g3`, healthy, `127.0.0.1:55437`.
- `weblogros_db` principal permaneció detenido; no se ejecutó seed ni se mutó la base temporal.
- URL de revisión: `http://100.65.11.85:3000/login`.

Comandos principales ejecutados:

```text
.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build
npm run build
npm start -- --hostname 0.0.0.0 --port 3000
Chrome headless con CDP local en 127.0.0.1:9227
harness CDP de captura y telemetría contra http://127.0.0.1:3000
```

La autenticación de QA utilizó JWT de corta duración con el mismo payload de la aplicación, firmado desde el secreto de la sesión temporal después de una lectura aislada de los IDs de Ana y Diego. No se imprimieron tokens ni secretos.

## Matriz de captura

Locale: `es-ES`  
Timezone: `Europe/Madrid`  
Reloj del navegador: `2026-09-20T12:00:00.000Z`

| Archivo | Rol | Viewport | Resultado |
| --- | --- | --- | --- |
| `ranking-player-1440x1024.png` | Ana Fernández / PLAYER | 1440×1024 | PASS técnico |
| `ranking-player-fullpage-1440.png` | Ana Fernández / PLAYER | 1440 px, página completa | 12 filas visibles en evidencia |
| `ranking-admin-1440x1024.png` | Diego Ruiz / TEAM_ADMIN | 1440×1024 | PASS técnico; misma geometría |
| `ranking-player-390x844.png` | Ana Fernández / PLAYER | 390×844 | PASS responsive |

Telemetría completa: `runtime-ranking.json`.

## Red, consola y datos

- PLAYER desktop: una petición GET de pantalla a `/api/equipos/halcones/ranking`, status 200.
- TEAM_ADMIN desktop: una petición GET de pantalla a `/api/equipos/halcones/ranking`, status 200.
- PLAYER móvil: una petición GET de pantalla a `/api/equipos/halcones/ranking`, status 200.
- Cada vista realizó además una única lectura de `/contexto`, status 200.
- Ninguna petición a `/dashboard`, `/jugadores` ni `/logros`.
- Cero errores de consola y cero excepciones JS.
- La telemetría conserva varios `net::ERR_ABORTED` con `canceled: true` causados por las navegaciones deliberadas del harness entre `/login` y ranking. No corresponden a las lecturas API: contexto y ranking terminaron en 200.

Payload/DOM verificados:

- totales: 12 miembros, 14 logros, 40 otorgamientos, 4280 puntos, 7 logros distintos y 10 participantes;
- media: `3,3` logros otorgados por miembro;
- participación: `83%`, `10 de 12 miembros`;
- top 3: Ana `790/7`, Marcos `700/6`, Laura `550/5`;
- 12 filas de 48 px;
- Daniel y Elena aparecen con `0 pts`, `0 logros` y estado de último logro vacío explícito;
- María ocupa posición 5 y Carmen posición 6 con empate `430/4`, conservando el orden del API;
- `Álex Moreno de la Fuente` conserva nombre completo en `title` accesible;
- las exclusiones funcionales permanecen ausentes: temporada, evolución, rachas como métrica, progreso mensual, Capitana y CTAs administrativos.

## Geometría y overflow

### PASS

- Sidebar: 172 px; cabecera tenant: 129 px.
- Grid desktop: 734,84 px / 469,83 px; columna izquierda `61,0%`.
- Podio: DOM `1–2–3`; orden visual desktop `2–1–3`.
- Móvil: orden DOM/visual `1–2–3`.
- Cero overflow global en 390, 768, 1024 y 1440 px.
- Tabla móvil: scroll horizontal interno, 332/704 px, sin desbordar el documento.
- Tabla a 768: scroll interno esperado; a 1024: 790/790 px, sin scroll.
- Cuatro tarjetas del strip inferior: 166×72 px en desktop; `scrollWidth === clientWidth`, `scrollHeight === clientHeight`, sin descendientes fuera del rectángulo.
- Fechas del strip: 86/86 px en desktop; sin recorte.
- Las seis celdas estadísticas no presentan scroll interno ni descendientes fuera de sus límites.
- Todos los paneles principales tienen `scrollHeight === clientHeight` y `scrollWidth === clientWidth`.

### ITERATE

1. **Jerarquía de altura del podio**: ganador 252 px frente a 221,59 px; diferencia real `13,7%`, por debajo del objetivo contractual `15–20%`.
2. **Tabla desktop a 1440**: el viewport interno mide 697 px y la tabla 704 px. Requiere 7 px de scroll horizontal por su `min-width`, aunque no existe overflow global. El contrato pedía no depender de scroll horizontal en desktop salvo justificación.

La evaluación visual de densidad, banda superior y ritmo corresponde al crítico independiente y no se reinterpreta aquí.

## Estados interceptados sin mutar fixture

| Estado | Evidencia | Resultado |
| --- | --- | --- |
| Loading | skeleton `role=status`, una petición pausada | PASS |
| Error genérico | `No pudimos cargar el ranking` | PASS |
| Retry | segunda petición recupera las 12 filas | PASS |
| Empty | 0 podio, 0 filas, stats seguras a cero | PASS |
| 1 miembro | un único puesto `[1]`, sin siluetas | PASS funcional |
| 2 miembros | dos puestos `[1,2]`, sin tercer hueco | PASS |

Observación de copy en el caso de un miembro: aparece `1 miembro ordenados por puntos y logros.`. La geometría/estado funcionan, pero la concordancia debería ser singular (`ordenado`).

No se ejercitaron por separado las variantes HTTP 401, 403 y 404; la prueba de error fue el 500 genérico con retry. Los estados alternativos se verificaron por DOM/telemetría y no generaron PNG adicionales.

## Incidencias del harness

El primer recorrido completó los cuatro PNG y las métricas pobladas, pero su aserción empty buscaba texto con mayúsculas/minúsculas sobre `innerText`; el CSS transforma visualmente el título y la comprobación agotó el timeout. No hubo impacto sobre runtime, DB ni capturas.

Al reintentar autenticación por login se alcanzó el rate limit de pruebas (`429`). No se reinició ni modificó el backend. El cierre final usó JWT QA de corta duración y una lectura de identidad en la base temporal. La aserción empty se corrigió a `textContent`; loading, error/retry, empty y 1–2 miembros terminaron PASS. Los cuatro PNG iniciales no se regeneraron tras ser entregados al crítico.

## Limpieza y entrega

- Chrome de captura PID `693392`: identidad/profile verificados y cerrado; `9227` quedó libre.
- Frontend `689502`, backend `620960` y PostgreSQL temporal permanecen vivos; frontend y health backend responden 200.
- No se modificaron `STATUS.md`, `TASKS.md`, `PLAN.md` ni código de producto durante QA.
