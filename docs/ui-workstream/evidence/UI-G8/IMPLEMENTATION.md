# UI-G8 — Implementación administrativa (2026-09-24)

## Alcance delegado
Pasos 4–6 de PHASE-7.7-PLAN: resumen, navegación administrativa local, invitaciones, miembros, catálogo/asignación, solicitudes y propuestas con detalle. Sin media real, cambios de shell compartido ni nueva gestión de roles/archivo/temporadas.

## Análisis de referencias previo
Se inspeccionaron manifest, README admin y las ocho imágenes canónicas del árbol admin. Lectura visual mediante node_repl fs.readFile + emitImage tras fallo técnico de view_image (wrapper Windows). No se duplicaron ni generaron referencias.
- Overview: fila KPI; cinco columnas compactas de administración en escritorio; franja inferior de accesos y consejo.
- Listados: herramientas sobre tabla principal, estados y columna lateral de ayuda; jerarquía de títulos condensados y superficies oscuras existentes.
- Detalles: información y criterios en columna amplia, resolución a derecha; formularios y estados antes que decoración.
- Invitaciones: resumen, creación y último enlace en dos columnas; listado inferior.
- Logros: catálogo y panel lateral de gestión real.
- Jugadores: búsqueda, rol y fecha de unión; tabla de miembros.
Se preservan geometrías principales, acento rojo, tokens/superficies existentes. Las imágenes de mockups y métricas sin contrato no se inventan.

## Contratos y decisiones
- Lecturas y escrituras usan /api/equipos/:slug con autorización de servidor existente.
- Layout usa contexto del equipo para impedir renderizar hijos administrativos a PLAYER. Shell existente ya mantiene Administración activa en subrutas.
- Revisión listados pide status=all explícito; filtros cliente sobre respuesta autorizada, no aislamiento privado cliente.
- Aprobar propuesta solicita puntos, categoría opcional, tipo, objetivo progresivo, alcance y secreto. Crea catálogo; nunca concesión.
- Rechazar requiere motivo 1–500 caracteres. Se deshabilita envío, guard ref contra doble clic, refresco tras éxito y error/concurrencia.
- Detalle solicitud usa extensión progress/season de Coordinator en temporada original. No consulta progreso actual como sustituto. Progresivo solo permite aprobar con ELIGIBLE.
- Catálogo integra AdminAchievementControls existente para secreto, progreso, concesión manual y cierre tras conceder.
- Invitación configura duración 1–30 días y usos 1–100, enlace del origen actual; copia con feedback y recuperación manual.
- Errores recuperables, vacío, carga, 401/403/404; enlaces navegables, labels y tablas semánticas.

## Diferencias funcionales justificadas respecto al mockup
Sin endpoints existentes para cambio de rol, retirada/archivo de miembros, revocar invitación, nombres de invitaciones, email de invitación, actividad administrativa, adjuntos/evidencias/comentarios ni Solicitar cambios. No se implementan botones falsos ni datos inventados. Consulta de miembros, creación/copia de invitaciones y acciones existentes preservadas.
No se incorporan perfil, temporadas ni eliminación de jugadores por inferencia.

## Validaciones worker
- ESLint dirigido a los 12 TSX administrativos: PASS.
- Código formateado mediante recast/parser Babel ya instalados; sin dependencias nuevas.
- Capturas, recorridos navegador, TypeScript/build global y comparación visual: responsabilidad Coordinator/QA; pendientes al entregar. Este informe no declara gate visual aprobado.

## Archivos
Todos dentro de apps/frontend/src/app/equipos/[slug]/admin:
AdminUI.tsx, layout.tsx, page.tsx, ReviewList.tsx, ReviewDetail.tsx,
invitaciones/page.tsx, jugadores/page.tsx, logros/page.tsx,
solicitudes/page.tsx, solicitudes/[id]/page.tsx,
propuestas/page.tsx, propuestas/[id]/page.tsx.
