# Retirada legacy User.displayName — QA

2026-09-24, base aislada Windows127.0.0.1:55437/weblogros_ui. Único actor runtime/migración: QA delegado por Coordinator. No CT/seed/reset.

[Guard SQL](legacy-guard-results.json): tres escenarios PASS sobre tablas TEMP User/TeamMembership con search_path pg_temp, verificación relpersistence=t, savepoint y rollback final. Texto representado global/alias permite DROP; huérfano y alias de otro usuario bloquean conservando columna. Nombres/alias no cambian y aliasnull no se repone. Se ejecuta cuerpo exacto SQL candidato quitando solo BEGIN/COMMIT externos para poder revertir; hash registrado en informe.

[Snapshot antes](legacy-snapshot-before.json) y [preservación después](legacy-preservation.json):13usuarios/14membresías, nombres globales y alias idénticos; columna retirada. Sin completar nombres inferidos ni backfill.

Comandos desde apps/backend con configuración local: `node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy` PASS17/17; migración aplicada20260924180000_remove_legacy_user_display_name. Después mismo launcher `generate` PASS Prisma7.5.0; `npm run build` PASS; `npm run seed:check` PASS (solo TypeScript, no seed). Backend antiguo36568/su listener31612 verificados y detenidos previamente.

Backend reiniciado hidden supervisor2456, cmd41988, listener2312 en3001. Configuración .env.ui-windows, logs locales ignorados apps/backend/.env.ui-windows-stdout.log/stderr.log. DB existente weblogros_ui_windows healthy conservada; frontend34968/39104 permaneció durante migración.

[Regresión perfil tras reinicio](legacy-profile-results-qa78legacy-1790269155343.json) PASS: GET/PATCH profile, alias propio, nullear/trim/fallback tenant, roles y strict mass assignment usando fixtures nuevos aislados eliminados. Snapshot identidades compartidas intacto. Script copia [legacy-profile.cjs](legacy-profile.cjs) guarda salida distinta del histórico7.8.

Reproducción guard: `node --env-file=apps/backend/.env.ui-windows docs/phase-7.8/qa/legacy-guard.cjs`. Antes/después snapshot usan legacy-snapshot.cjs before/after; no ejecutar before después de DROP. PID históricos requieren verificación antes de parada.
