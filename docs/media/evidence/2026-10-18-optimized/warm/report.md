# Prueba local de imágenes

Fecha: 2026-10-18T18:34:55.275Z. Resultado: **REVISAR**.

| Medida | Resultado |
| --- | --- |
| Trabajos correctos | 50/50 |
| RSS Sharp conjunto muestreado | 445.2 MiB |
| Cota superior con máximos solapados | 479.7 MiB |
| RSS backend máximo | 187.7 MiB |
| Temporal lógico máximo | 117.8 MiB |
| Sharp p95 / máximo | 770 / 887 ms |
| Cola máxima | 7488 ms |
| Salud p95 / máximo | 11 / 50 ms |
| Limpieza | PASS |

## Comprobaciones

- allJobsSucceeded: PASS
- workerMetricsComplete: PASS
- workerLifecycleComplete: PASS
- twoWorkersObserved: PASS
- fullQueueAndRejection: PASS
- cleanupPassed: PASS
- fifo: PASS
- sharpTimeout: PASS
- queueTimeout: PASS
- backendResponsive: PASS
- workerMemoryBudget: PASS
- temporaryBudget: PASS
- initialFreeDiskMargin: PASS
- dockerMetricsAvailable: PASS
- dockerConfigurationAvailable: PASS
- seaweedMemoryBudget: REVISAR
- actorExitClean: PASS

## Límites de la evidencia

- Corpus sintético con padding: frontera de bytes/píxeles, no peor entropía posible.
- RSS combinado muestreado; high-water por proceso con solapamiento es cota superior, no pico simultáneo exacto.
- Docker stats es memoria de contenedor, no RSS, con menor frecuencia; disco temporal lógico no es disco físico S3.
- Sin frontend ni carga funcional mixta; salud verifica HTTP/DB, no experiencia completa.
- Tandas cortas sin GC forzado: retención del allocator no demuestra fuga ni su ausencia.

Entorno, hashes, tiempos, CPU, contenedores y tandas: report.json. Trazas sin credenciales: samples.json.
