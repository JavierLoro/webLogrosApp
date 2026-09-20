# UI-G4 — QA de flujo real de formularios

Fecha: 2026-09-20  
Entorno: sesión temporal aislada en CT112 (`/tmp/weblogros-ui-review-g3`)  
Resultado: **PASS**

## Aclaración de la evidencia de iteración 0

Los POST controlados documentados en la iteración 0 se ejecutaron directamente contra la API. No constituían una prueba del formulario en navegador. Esta evidencia complementaria verifica los dos formularios reales mediante interacción DOM y el botón de envío de la aplicación, sin reiniciar servicios, reconstruir, reseedear ni cambiar código.

La autenticación de QA se realizó inyectando en `localStorage` un JWT firmado para la base temporal. Desde ese punto, navegación, validación, serialización, POST y redirección fueron los del frontend real.

## Preflight y entorno

- Preflight `local runtime`: PASS.
- Memoria disponible: 7221 MiB de 8192 MiB.
- Swap: 89% utilizada; 54 MiB libres (warning conocido, sin lanzar servicios nuevos de aplicación).
- Base principal `weblogros_db`: detenida e intacta.
- Frontend de revisión: PID `665035`, sesión `25296`, `0.0.0.0:3000`.
- Backend de revisión: PID `620960`, sesión `88569`, puerto `3001`.
- PostgreSQL temporal: contenedor `weblogros_ui_review_g3`, healthy, publicado solo en `127.0.0.1:55437`.
- Navegador temporal de QA: PID `671527`, puerto CDP `9226`; detenido al finalizar tras verificar su identidad. El puerto quedó libre.

## PLAYER — propuesta

Cuenta: `ana@halcones.test` (`PLAYER`).

### Validación vacía

- Alertas visibles:
  - `Escribe un nombre para el logro.`
  - `Describe la idea que quieres proponer.`
  - `Añade al menos un criterio para enviar la propuesta.`
- Permaneció en `/equipos/halcones/logros/nuevo`.
- Peticiones POST observadas: **0**.

### Envío exitoso

Payload capturado en la petición real a `/api/equipos/halcones/propuestas`:

```json
{
  "nombre": "QA-FORM-PROP-1789916392668",
  "descripcion": "Propuesta creada por QA mediante formulario real.",
  "criterios": ["Criterio QA verificable."]
}
```

- Se pulsó enviar dos veces con 25 ms de separación.
- Peticiones POST observadas: **1**.
- Redirección final: `/equipos/halcones/solicitudes`.
- Fila creada: `PropuestaLogro.id = 8`, estado `PENDING`, payload exacto.
- La propuesta no apareció en catálogo ni creó concesiones.

## TEAM_ADMIN — logro

Cuenta: `diego@halcones.test` (`TEAM_ADMIN`).

### Validación vacía

- Alertas visibles:
  - `Escribe un nombre para el logro.`
  - `Indica cuántos puntos vale el logro.`
- Permaneció en `/equipos/halcones/logros/nuevo`.
- Peticiones POST observadas: **0**.

### Envío exitoso

Payload capturado en la petición real a `/api/equipos/halcones/logros`:

```json
{
  "nombre": "QA-FORM-LOGRO-1789916392668",
  "puntos": 75,
  "descripcion": "Logro creado por QA mediante formulario real.",
  "categoria": "Equipo",
  "criterios": ["Criterio QA verificable."]
}
```

- Se pulsó enviar dos veces con 25 ms de separación.
- Peticiones POST observadas: **1**.
- Redirección final: `/equipos/halcones/logros`.
- Fila creada: `Logro.id = 21`, payload exacto.
- No se creó `UserLogro` ni `SolicitudLogro`.

## Filtro sin resultados

- Catálogo inicial: 14 tarjetas.
- Búsqueda `ZZZ-SIN-RESULTADOS-QA`: 0 tarjetas. El componente fuente define para ese estado el título `No hay coincidencias`; la aserción runtime se limitó al conteo de tarjetas.
- Al limpiar el filtro: 14 tarjetas restauradas.

## Limpieza e invariantes

Se eliminaron exclusivamente los registros QA por sus IDs exactos (`PropuestaLogro.id = 8` y `Logro.id = 21`). Tras la limpieza:

- propuestas: 6;
- logros: 19;
- concesiones: 42;
- solicitudes: 8;
- ambos IDs QA ausentes;
- conteos idénticos al baseline.

El primer intento del harness de navegador falló antes de completar la prueba por usar una API DOM fuera del contexto de página; registró cero POST y cero mutaciones. Se corrigió únicamente el harness y se repitió la prueba acotada.

## Conclusión

PASS: validación vacía sin POST, payload exacto, creación por rol, redirección por rol, protección frente a doble envío, invariantes de dominio y limpieza exacta. La sesión de revisión continúa viva; solo se cerró el Chrome temporal de QA.
