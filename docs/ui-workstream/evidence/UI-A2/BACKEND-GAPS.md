# UI-A2 — Backend gaps

Seguimiento de contratos backend que las pantallas necesitan y que no deben sustituirse con
peticiones N+1, datos inventados ni ceros decorativos.

| Issue | Pantalla | Gap | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| [#10](https://github.com/JavierLoro/webLogrosApp/issues/10) | `/equipos` | Estadísticas agregadas de las tarjetas de equipo | EN CURSO | Implementación local; pendiente de validación y enlace a PR/commit |

## #10 — Estadísticas de las tarjetas de Mis equipos

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

La fila se marcará `COMPLETADO` cuando exista el enlace a la PR o al commit de resolución, como
exige la issue.
