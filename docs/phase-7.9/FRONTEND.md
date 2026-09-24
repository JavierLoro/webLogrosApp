# Frontend 7.9 — temporadas

## Alcance

Nueva ruta `/equipos/[slug]/admin/temporadas`: lista de periodos con fechas/estado, creación en PLANNED, confirmación explícita para activar o cerrar. Activar advierte del cierre automático de la temporada anterior; CLOSED no ofrece reactivación. Fechas informativas, transiciones manuales. Error conserva borrador; 409/404 refrescan lista y cierran confirmación obsoleta. Cerrojo por petición evita duplicados.

Ranking: selector Actual y periodos ACTIVE/CLOSED, nunca PLANNED. Actual consulta `/ranking`; selección histórica `/temporadas/:id/ranking`. Request key incluye slug/selección/reintento, abort y comprobación de señal previenen respuestas obsoletas. Explica suma permanentes+estacionales y ausencia de activa. No promete snapshot inmutable.

## Archivos

- `apps/frontend/src/app/equipos/[slug]/admin/temporadas/page.tsx`
- `apps/frontend/src/app/equipos/[slug]/admin/layout.tsx`: enlace Temporadas.
- `apps/frontend/src/app/equipos/[slug]/admin/page.tsx`: acceso rápido.
- `apps/frontend/src/app/equipos/[slug]/ranking/page.tsx`
- `apps/frontend/src/types/api.ts`: Season y TeamRanking.season.

Sin backend, shell, assets, upload, tokens ni control plane. Formulario keyed por API tenant. Restricción TEAM_ADMIN heredada del layout y API; lecturas ranking para miembros.

## Referencias y revisión

STATUS y contrato FRONTEND_WORKER consultados; manifest y skill image-to-code aplicados con alcance de extensión funcional autorizado. Inspeccionadas imágenes canónicas ranking-desktop-v1 y administracion-equipo-desktop-v2: se mantienen superficies carbón, bordes discretos, jerarquía display y acentos existentes. No existe referencia propia de gestión temporadas; los nuevos controles reutilizan AdminUI y TeamSurface. No se generan imágenes nuevas ni se autoaprueba gate.

QA pendiente: creación/validación/duplicado, confirmación y cancelación, cierre anterior, ranking actual/histórico/sin activa, aislamiento y permisos, móvil/desktop, error/reintento y capturas. Coordinator revisa extensión visual independiente.

Fechas de calendario: entrada date convertida a ISO UTC y representación con Intl timeZone UTC; evita desplazar el día por huso. Valida fechas finitas antes de toISOString. Selector muestra nombre y estado recibido en ranking aunque falle la lista de opciones.

Preflight Windows: CIM escalado PASS ~6.46 GiB disponibles (sandbox CIM sin acceso). TypeScript primera pasada PASS; sin build/restart ni cambios de servicios.

Validaciones finales: ESLint dirigido a los cinco archivos TS/TSX PASS; npx tsc --noEmit PASS tras correcciones; git diff --check de archivos modificados PASS. Revisión visual/QA de navegador corresponde al Coordinator y QA_CAPTURE.

Revisión preventiva: textos de confirmación y nombre/explicación del ranking admiten ruptura de palabras largas (120 caracteres sin espacios), sin cambios de semántica. Diff-check PASS; QA captura móvil del caso largo solicitada.

Corrección QA nombre120: primera clase break-words no evitó scrollWidth654 en móvil390. Grid móvil cambiado de track implícito auto a minmax(0,1fr); nombres usan overflow-wrap:anywhere para reducir min-content, flex texto botón envuelto en span min-w-0, contenedores nombre/confirmación max-w-full. No se recorta contenido ni oculta overflow; retest dirigido QA pendiente.


Cierre posterior: QA de navegador y build PASS, defecto nombre120 corregido con retest. [Evidencia](qa/QA.md), [gate visual Coordinator](COMPARISON-COORDINATOR.md).
