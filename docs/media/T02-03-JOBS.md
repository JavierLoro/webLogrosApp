# 7.10 / T02.03 — Cola persistente y estados de trabajo

Fecha: 2026-10-15. **EN CURSO: componentes y enlace recepción/Prisma implementados/probados localmente; controlador/HTTP, publicación, recuperación y avisos por completar.** [Enlace14/14](MEDIA-UPLOAD-INTAKE.md) confirma QUEUED con claim/ruta/tipo tras cierre; admisión adaptada9/9 y toma5/5 PASS. Diez reservas/FIFO/180 s desde QUEUED, bajo demanda. Sin endpoints, disparador automático/S3/asociación ni presupuesto/limpieza durable completos. Esperar comprensión del código del enlace antes del siguiente bloque.

## 1. Mecanismo elegido

Usar el **PostgreSQL existente para una cola propia de trabajos persistentes**. Cada trabajo tiene un registro que el backend consulta y actualiza. La durabilidad del registro permite conocer el estado al volver a la página y reconciliarlo al reiniciar; no garantiza que el trabajo se haya ejecutado, ni autoriza reintentos automáticos.

Ya existen un ejecutor aislado por proceso Node hijo, toma persistente de QUEUED y función interna que ejecuta esa asignación una sola vez. Cancelación/timeout esperan cierre; el enlace registra PUBLISHING con manifiesto/ruta o un terminal confirmado, con CAS por token. PostgreSQL coordina/conserva el registro; no ejecuta Sharp. Admisión y acuse de recepción cerrada son funciones internas probadas; falta el receptor físico y el disparador automático que invoque el recorrido.

Motivos: el entorno ya usa PostgreSQL, el volumen inicial es de dos trabajos activos y diez pendientes, y necesitamos coordinar estado/propietario/recurso y admisión de forma transaccional. Esta elección se limita al piloto acordado; no afirma que una cola propia resuelva por sí sola recuperación, temporales o cancelación.

## 2. Datos del trabajo, del temporal y de la imagen

Registro base `MediaJob` ya implementado; las referencias de imagen/temporal y relaciones definitivas se completan en T03. Tabla siguiente mezcla la base actual con el recorrido todavía pendiente, indicado en [el resultado del registro](MEDIA-JOB-REGISTRY.md).

| Lugar | Qué conservará |
| --- | --- |
| Registro de trabajo en PostgreSQL | ID interno, solicitante autenticado, alcance usuario/equipo/recurso, estado, referencias internas al temporal/resultados, bytes conocidos, tiempos, causa de fallo segura y datos de coordinación/versionado |
| Directorio temporal privado | Bytes de entrada comprimidos y archivos de trabajo mientras corresponda según su estado/limpieza |
| SeaweedFS | Variantes definitivas guardadas por ObjectStore |
| Referencia de imagen en PostgreSQL | Relación de las variantes con avatar/logo/logro/borrador/propuesta y datos técnicos necesarios |

El registro no almacena el original como blob, credenciales ni EXIF/GPS/autor originales. No usar el nombre enviado por el navegador como ruta. La identidad y los permisos proceden de sesión/matriz de media; no basta un userId/teamId que el cliente declare. La asociación estable de avatar/equipo se coordina con PLAYER-LC-T01 en T03.

El **estado de trabajo** es distinto del estado de una propuesta. Una imagen puede quedar lista en un borrador sin que ese borrador pase automáticamente a revisión o que el logro aparezca en catálogo.

## 3. Estados conceptuales del recorrido

```text
Recepción -> En espera -> Procesamiento -> Asociación/publicación -> Lista
                  |
        Fallo, cancelación o interrupción según lo ocurrido
```

| Estado | Significado |
| --- | --- |
| RECEIVING — Recepción | Existe registro/reserva y se está recibiendo una entrada. No es aún una imagen completa |
| QUEUED — En espera | Entrada completa admitida y disponible para tomar un turno; sigue comprimida en disco |
| PROCESSING — Procesamiento | Un ejecutor tiene asignado el trabajo y genera/valida todas sus variantes; ocupa un turno global |
| PUBLISHING — Asociación/publicación | Resultados generados; se guardan/verifican objetos y se confirma la referencia vigente. Aún no se comunica éxito |
| SUCCEEDED — Lista | Variantes guardadas y asociadas correctamente al recurso; la entrada temporal queda pendiente de retirada inmediata/limpieza verificable |
| FAILED — Fallo | No se completó el recorrido; causa segura, conservación de imagen anterior y reintento manual según contrato |
| CANCELED — Cancelado | Cancelación efectiva completada sin sustituir la imagen anterior; no confundir petición de cancelación con proceso ya detenido |
| INTERRUPTED — Interrumpido | Una ejecución/recepción afectada por reinicio se reconcilió sin éxito confirmado; requiere reenvío manual |

El enum ya existe en la base, pero este cuadro no implementa todo el recorrido. Se admite/consulta RECEIVING, se confirma internamente el paso a QUEUED, se toman turnos y se ejecutan bajo marca de inicio único. El [enlace](MEDIA-JOB-EXECUTION.md) registra PUBLISHING o FAILED/CANCELED después de cierre/sin proceso creado; cancelación local y CAS probados. No hay receptor físico ni disparador automático, cancelación entre instancias o recuperación. Un estado terminal por sí solo no demuestra ausencia de ejecución nativa: el llamador debe respetar el protocolo de cierre.

SUCCEEDED exige guardado **y asociación**, no solo una respuesta de Sharp o un PutObject correcto. Si queda limpieza pendiente después de un éxito confirmado, reintentar la limpieza no debe volver a procesar ni convertir el éxito de la imagen en un fallo ficticio. La referencia de resultados/cancelación necesita versionado para impedir publicación tardía; diseño pendiente de completar.

## 4. Coordinación transaccional requerida

La toma de un trabajo debe comprobar su estado, disponer del turno global y asignar ejecución como una operación transaccional corta. No separar «consultar libre» y «marcar tomado»: dos ejecutores podrían leer lo mismo y procesarlo dos veces o superar el máximo global.

PostgreSQL ofrece transacciones y bloqueos para coordinar comprobaciones/escrituras. Reserva UNIQUE por destino, [dos puestos persistentes](MEDIA-JOB-CLAIMS.md) y [diez esperas](MEDIA-JOB-ADMISSION.md) probados con el mismo advisory xact lock. PROCESSING/PUBLISHING ocupan puestos; RECEIVING/QUEUED comparten esperas. La toma usa ahora queuedAt/id entre archivos completos elegibles, con plazo DB vigente. La reserva por recurso no aplica por sí sola estos máximos: deben usarse los servicios de admisión/toma coordinados. Receptor/disparador/presupuesto físico y referencias aún se completan en T02.03/T03.

No mantener una transacción abierta durante la recepción o durante Sharp. Solo los cambios de estado/referencia requieren transacciones cortas; el trabajo lento ocurre fuera. Esto evita bloquear peticiones mientras el archivo se transfiere o transforma. Un contador local en memoria no representa el máximo global si llegan peticiones a varios procesos.

Fuentes primarias: [transacciones PostgreSQL 16](https://www.postgresql.org/docs/16/tutorial-transactions.html), [bloqueos de filas PostgreSQL 16](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS). Es una elección de arquitectura derivada de esas capacidades, no una implementación probada de cola.

## 5. Navegación y recuperación de estado

Si la entrada completa ya fue admitida, navegar o cerrar la página no cancela el trabajo. Al volver, el frontend consultará los trabajos del usuario y mostrará su estado real; la lista disponible en el navegador no será la autoridad. Nunca presentar un porcentaje de avance que el servidor no mida.

Cerrar durante una transferencia incompleta puede cortar la entrada: debe detectarse y limpiar el parcial, según el receptor y su protocolo HTTP. El ensayo Busboy verifica errores de flujo, pero la desconexión HTTP real sigue por implementar/probar.

Tras reiniciar el procesador se conserva el registro para comprobar qué ocurrió. Los trabajos afectados no se reanudan/reenvían automáticamente, según el acuerdo del producto. Primero verificar referencia y resultado duradero para reconocer los que sí terminaron; no declarar fallo solo porque el navegador perdió una respuesta. Los detalles de ejecución antigua, interrupción y limpieza se completan antes de cerrar T02.03.

## 6. Pendientes para cerrar T02.03

1. Completar el enlace ya probado con publicación/asociación y cancelación distribuida: existe tipo/directorio temporal, inicio único y resultado/CAS por token tras cierre. Faltan petición durable de cancelar, control entre instancias, permisos al publicar y carreras del recorrido S3/asociación; no confundir el handoff local a PUBLISHING con éxito final.
2. Completar [admisión interna ya probada](MEDIA-JOB-ADMISSION.md) con recepción y controlador: diez reservas RECEIVING/QUEUED, dos puestos activos, queuedAt/id y 180 s desde QUEUED implementados. Vencimiento bajo demanda, sin temporizador permanente; RECEIVING retiene plaza hasta cierre confirmado. Falta persistir ruta temporal al encolar/derivarla para limpieza, controlar espacio y permisos, duración/desconexión de transferencia y disparar la toma automáticamente.
3. Reinicio y fallos DB/S3: reconciliar éxito confirmado e interrumpir afectados; no liberar capacidad mientras pueda seguir una ejecución ni borrar resultados referenciados.
4. Reconocimiento/caducidad de avisos y peticiones repetidas: consulta al volver, reintento manual, doble envío y carreras entre pestañas. No crear política de borrado de propuestas/borradores a partir de la caducidad de un aviso.
5. Matriz de transiciones/errores y pruebas esperadas que permitan cerrar el diseño y alimentar T02.04/T03.

Los límites existentes (2 + 10, 180/30 s, 3 borradores/persona, 5 propuestas pendientes por jugador/equipo) se mantienen. Las plazas de trabajo de imagen y las cuotas de borrador/propuesta son contabilidades diferentes; terminar un trabajo no envía una propuesta ni consume automáticamente una plaza PENDING.

Siguiente punto guiado: explicar el [enlace recepción/Prisma y su código](MEDIA-UPLOAD-INTAKE.md), esperar comprensión antes de controlador/HTTP o siguiente conexión de ejecución. T02.03/T05.03 siguen parciales; referencias anteriores a recepción pendiente describen las piezas previas, cuyo enlace actual consta en la evidencia nueva. Recuperación, presupuesto físico y publicación siguen pendientes.
