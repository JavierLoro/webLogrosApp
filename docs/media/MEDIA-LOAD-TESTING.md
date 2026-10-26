# Pruebas repetibles de consumo y carga de imágenes

Fecha: 2026-10-18. Alcance: backend del catálogo existente, Prisma/PostgreSQL, Sharp y almacén S3. No cierra el recorrido de producto ni la fase 7.10.

## Qué se ejecuta

`apps/backend/src/experiments/media-benchmark/run.ts` es un ejecutor independiente del servidor. Primero genera dos imágenes sintéticas de 6000 × 4000 píxeles: JPEG con textura y PNG con transparencia variable. Ambas pesan exactamente 10.000.000 bytes. Incluyen padding legal para probar la frontera de tamaño; no representan la peor entropía ni todos los posibles archivos del usuario. El manifiesto distingue los bytes de padding y guarda SHA-256 y versiones de Sharp/libvips.

El generador corre en un proceso separado y termina antes de medir. El envío de los formularios también ocurre fuera del backend medido. No atribuimos su memoria al consumo de la aplicación.

El actor arranca un servidor de pruebas en una dirección loopback y puerto libre, con el router multimedia real, Prisma, runtime y ejecutor productivos. Crea su usuario, equipo y trece logros identificados por un UUID. No cambia los límites de producción ni sustituye el almacenamiento por un doble.

1. Tres segundos de reposo para obtener una referencia del backend.
2. Parejas de imágenes máximas simultáneas: JPEG/PNG, JPEG/JPEG y PNG/PNG. Así el caso de dos JPEG no depende del orden casual de llegadas de la cola.
3. Dos puestos activos y diez pendientes; una decimotercera petición a otro logro debe responder 503. Para llenar esta situación de forma repetible, solo en esta etapa se bloquea el ejecutor antes del fork. Al liberar la compuerta, el procesamiento y la publicación son reales. La espera controlada se distingue del tiempo de Sharp. La petición rechazada declara multipart y tamaño, pero espera respuesta tras enviar solo las cabeceras: comprueba admisión antes de gastar ancho de banda, no una transferencia completa número trece.
4. Cuatro tandas de cuatro imágenes por defecto; `--batches 8` amplía a ocho. Entre tandas se comprueba retirada de temporales y ausencia de borrados S3 pendientes, y se espera dos segundos sin forzar GC.
5. Lectura real de una imagen asociada, referencias READY, cierre del runtime y eliminación/verificación de todos los objetos propios mediante DELETE + HEAD.

Por defecto son 34 imágenes y una petición rechazada. Con ocho tandas son 50 imágenes y una petición rechazada. El caso de mayor salida es el logro; logos y avatares todavía no tienen sus recorridos HTTP integrados y no se declaran validados por esta prueba.

## Cómo repetirlo

Desde `apps/backend`, con las dependencias de `package-lock.json` instaladas y las migraciones aplicadas a un entorno de pruebas:

```text
npm run build
npm run bench:media -- --env-file ../../.env.media.local --env-file .env.ui-windows --database weblogros_ui --bucket lockerboard-media-dev --allow-fixtures --containers weblogros_ui_windows,weblogros_media_windows-seaweedfs-1 --batches 8
```

Es el comando del piloto Windows. En otro despliegue se cambian archivos de entorno, nombre de base de datos, bucket y nombres de contenedores. Se pueden heredar las variables del entorno sin pasar `--env-file`; los ficheros indicados se cargan en orden, prevaleciendo el último. `--containers` es opcional si no hay Docker, pero sin él no se mide el consumo del almacenamiento/DB y no se declara aprobado el presupuesto de SeaweedFS. El código Node y los argumentos funcionan también en Linux; esta entrega se ha ejecutado en Windows, no acredita una ejecución Linux.

El backend habitual debe estar detenido y no debe haber trabajos multimedia activos. El actor toma el mismo bloqueo exclusivo del runtime; no trabaja en paralelo con otro procesador. Usar un entorno de prueba con la misma configuración y recursos del despliegue que se quiera evaluar. El nombre esperado de base de datos y bucket se comprueba antes de escribir; `--allow-fixtures` hace explícita la creación y posterior retirada de datos de prueba. No se hace reset de datos ni listado/borrado global del bucket. Las escrituras ajenas concurrentes invalidarían la comparación de recuentos antes/después.

`--output RUTA` permite elegir el directorio de resultados. Por defecto se usa `.bench-results/fecha-UUID`, excluido de Git. Los temporales viven en una raíz `mkdtemp` privada. Solo se retira esa raíz tras comprobar cierre del actor, limpieza y ruta canónica; en caso de fallo queda disponible para revisión. No se guardan JWT, cookies, credenciales, URLs privadas de conexión ni nombres de archivos personales en los informes.

## Archivos y arquitectura del ensayo

| Archivo en `src/experiments/media-benchmark/` | Responsabilidad |
| --- | --- |
| `run.ts` | Orquesta fases, envía multipart, comprueba estados, mide disco/salud y genera informes |
| `actor.ts` | Monta HTTP/runtime reales, crea fixtures propios, instrumenta fork y limpia el namespace |
| `corpus.ts` / `corpusProcess.ts` | Crea el material determinista antes de medir y termina su proceso |
| `workerMetricsPreload.ts` | Registra memoria nativa/RSS y CPU dentro de cada proceso Sharp, sin alterar su protocolo IPC |
| `metrics.ts` | Lee muestras, recorre el temporal sin seguir enlaces, consulta Docker y registra el entorno |
| `corpus.test.ts` / `metrics.test.ts` | Verifica padding/CRC/decodificación y las utilidades de medición |

La instrumentación se instala exclusivamente en el actor del benchmark. No se importa desde `server.ts` ni modifica la admisión, el timeout, la concurrencia o la compresión productivos.

## Qué contienen los resultados

- `report.md`: resumen legible y cada comprobación.
- `report.json`: entorno, hashes, versiones, límites Docker/cgroup disponibles, fases, tiempos, CPU, memoria y evidencia de limpieza.
- `samples.json`: muestras de backend, procesos Sharp, disco temporal, Docker, salud, estados y peticiones; permite recalcular resultados.

Salida del comando: **0** si todo cumple; **2** si el flujo es correcto pero alguna provisión de recursos debe revisarse; **1** si falla el ensayo o una garantía funcional/de medición/limpieza. No se aumenta ningún presupuesto ni se oculta un exceso para obtener un PASS.

Memoria de backend/Sharp se muestrea aproximadamente cada 100 ms; además se recoge el máximo RSS de cada proceso. El pico conjunto muestreado puede perder picos breves. La suma de máximos de procesos con vidas solapadas es una **cota superior conservadora**, no un pico simultáneo medido. Nunca se suman los máximos de todos los procesos consecutivos.

La salud HTTP con ping a PostgreSQL se consulta cada 250 ms aproximadamente. Docker se observa en un bucle independiente y más lento; `docker stats` informa memoria de contenedor, no RSS ni un límite impuesto. CPU se expresa como tiempo consumido y, por fase, núcleos medios utilizados; no se confunde tiempo de CPU con duración de una petición.

El temporal se mide en bytes lógicos, incluido su marcador. Tras cada tanda debe volver al marcador inicial, sin directorios de trabajo. DELETE + HEAD confirma retirada lógica de objetos S3; no demuestra recuperación inmediata del espacio físico de los volúmenes de SeaweedFS.

Las provisiones se contrastan con [T02.02](T02-02-RESOURCES.md): 1 GiB para ambos procesos Sharp, 256 MiB para SeaweedFS, 1 GiB temporal y margen de disco. Son objetivos iniciales, no cuotas ni límites efectivos del contenedor. Repetir en el servidor con su memoria/CPU reales antes de darlo por apto para despliegue.

Un ensayo corto con corpus sintético no certifica ausencia de fugas, calidad visual de todos los formatos, carga sostenida de horas ni latencia completa del frontal. La evolución de RSS entre tandas se conserva como observación, sin interpretar automáticamente retención del allocator como fuga.

## Observación de transporte a revisar al integrar el frontal

Una ejecución con cola llena y envío inmediato del cuerpo completo de 10 MB mediante `fetch` de Node terminó con error de transporte, antes de poder leer el JSON 503. El servidor rechaza pronto y cierra deliberadamente la conexión mientras el cliente sigue escribiendo. Una ejecución anterior sí recibió el 503 con el mismo montaje. No se interpreta el reset como una admisión adicional ni como un fallo de Sharp.

El ensayo estable verifica el rechazo temprano mediante HTTP por cabeceras. Sigue pendiente comprobar el navegador real al integrar la subida: un error de conexión no permite afirmar «cola llena» ni éxito, y puede requerir revisar el transporte/respuesta temprana. No se ha cambiado el API productivo para ocultar este hallazgo.

## Resultado verificado — 2026-10-18, piloto Windows

Ejecución de referencia: `80d7f34d-92dd-424e-9b27-7273fca73ece`, iniciada2026-10-17T23:22Z UTC (18/10 en Europe/Madrid). **Flujo y medición: PASS. Presupuesto de recursos: REVISAR.** La única provisión que falla es la de SeaweedFS. El proceso del actor salió con código0 y se cerraron sus pipes; el runner indica revisión de presupuesto con código2.

Entorno: Windows x64, Node24.14.0, Sharp0.35.5/libvips8.18.7, PostgreSQL16 y SeaweedFS4.47. Host de31,81GiB y20 procesadores lógicos. Los contenedores no tenían límite explícito de RAM/CPU configurado; no es un ensayo de un servidor pequeño ni una validación bajo cuotas de producción. La segunda y siguientes ejecuciones reutilizaron el almacén en caliente, sin reiniciarlo ni forzar GC.

| Comprobación / medida | Resultado |
| --- | --- |
| Imágenes válidas | **50/50 SUCCEEDED**,150 variantes generadas |
| Concurrencia / cola | Máximo2 activos y10 pendientes; petición adicional503 por capacidad; FIFO PASS |
| Pareja JPEG/JPEG: RSS simultáneo muestreado | **948,7MiB** |
| Pareja PNG/PNG: RSS simultáneo muestreado | **263,8MiB** |
| Cota conservadora de máximos RSS solapados | **998,7MiB**, frente al objetivo1024MiB |
| Backend RSS de reposo inicial / pico | **120,0 /185,7MiB** |
| SeaweedFS, memoria máxima del contenedor | **530,5MiB**, supera256MiB previstos |
| PostgreSQL, memoria máxima del contenedor | **65,8MiB** |
| Temporal lógico máximo | **117,8MiB**, frente a1024MiB de presupuesto |
| Sharp, p95 / máximo | **794 /899ms**, por debajo de30s |
| Espera máxima antes de ocupar puesto | **7,018s**, incluido el tramo controlado, por debajo de180s |
| Grupo de12 trabajos tras liberar la cola | **8,260s** para terminar guardado/asociación |
| CPU Sharp durante ese grupo | **1,29 núcleos medios**, además de backend/DB/almacén |
| Salud HTTP/DB | **251/251 respuestas200**; p95 **9,2ms**, máximo **100,7ms** |
| Cierre / limpieza |50 workers con4 eventos completos cada uno;151 claves propias verificadas ausentes (incluido preflight); recuentos de DB iguales antes/después |

Entre todas las tandas se retiraron los directorios de trabajo y se completaron las limpiezas S3 pendientes. Se eliminó también la raíz temporal del ensayo después de confirmar cierre y propiedad. El backend habitual se restauró: `/health`200 e imagen sin sesión401/no-store.

El objetivo de1GiB para Sharp se cumple con este corpus, pero su cota conservadora deja solo unos25MiB de margen. No se debe interpretar como una garantía universal ni como una provisión holgada. Los256MiB de SeaweedFS quedan refutados por la medición: en las ejecuciones completas se observaron aproximadamente385,540 y531MiB. Tampoco quedan acreditados512MiB como límite suficiente. No se cambió ninguna cuota, memoria Docker, concurrencia, compresión ni timeout para hacer pasar el ensayo.

La RAM del backend en los reposos de las ocho tandas osciló aproximadamente entre155 y180MiB, por encima del reposo inicial. La memoria del almacén también varió durante las repeticiones. **No hay evidencia suficiente de estabilización ni diagnóstico de fuga**: hacen falta un ensayo sostenido y una revisión de memoria/GC/cachés antes de cerrar dimensionamiento. Los archivos sí volvieron al estado limpio comprobado. No se suman máximos de componentes tomados en instantes diferentes para inventar un pico total del servidor.

Evidencia conservada en el repositorio: [report.json](evidence/2026-10-18-load/report.json), [trazas comprimidas](evidence/2026-10-18-load/samples.json.gz) y [hashes](evidence/2026-10-18-load/manifest.json). Para inspeccionar la traza: descomprimir gzip y leer el JSON; el manifiesto incluye hash tanto del JSON original como del gzip. Los reportes completos sin comprimir siguen disponibles en `.bench-results/local-verified/` del piloto, fuera de Git.

Durante el montaje del ensayo se corrigieron cierre de canales del actor y el envío del rechazo temprano. Las iteraciones previas se conservan como diagnóstico local; la ejecución de referencia anterior usa el montaje final con parejas de formatos, validación completa del ciclo de workers y cierre correcto. Tests dirigidos:6 PASS y2 omitidos (corpus completo opt-in y enlaces simbólicos no permitidos en esta cuenta); el corpus completo también se probó explícitamente por separado con4/4 PASS. Build y `git diff --check` PASS. No se reejecuta ni se renombra como nueva la evidencia previa de155 comprobaciones del backend.

## Diagnóstico de RAM de SeaweedFS — 2026-10-18

Continuación solicitada tras abrir Docker Desktop. El motor estaba disponible y el servicio detenido; se arrancó exclusivamente el SeaweedFS existente mediante su Compose, con el mismo volumen y configuración. Tras el arranque se observaron unos135MiB según Docker; en una carga directa de50 publicaciones S3 con dos tareas concurrentes se alcanzaron333MiB. Las claves de esa carga, bajo un prefijo UUID exclusivo, se retiraron y comprobaron con HEAD. No se tocó Prisma ni se procesaron imágenes con Sharp en este diagnóstico.

La medida equivalente a Docker se calculó como `memory.current - inactive_file` del cgroup v2. Se guardaron también anon/file y VmRSS/RssAnon/RssFile de `/proc/1/status`. Docker excluye caché de archivos inactiva, mientras RSS del proceso incluye sus páginas residentes respaldadas por archivos; no son medidas intercambiables. El incremento observado estaba principalmente en memoria anónima. El servicio es Linux amd64 dentro de Docker; no es una medida del consumo completo de Docker Desktop en Windows.

Como el servicio habitual no expone perfiles de Go, se crearon tres instancias temporales secuenciales con la misma imagen local exacta, cada una con volumen nuevo, S3 solo en loopback con puerto efímero y métricas/debug internos. Se mantuvieron iguales la carga, la concurrencia y la instrumentación. No hubo límite duro de memoria de Docker. Solo se varió el objetivo flexible `GOMEMLIMIT` de Go.

| Configuración temporal | Pico equivalente a Docker |50 publicaciones S3 |Recogidas de basura desde arranque hasta perfil natural |
| --- | ---: | ---: | ---: |
| Valores por defecto |255,6MiB |5,740s |12 |
| GOMEMLIMIT=192MiB |71,9MiB |7,514s |1.741 |
| GOMEMLIMIT=384MiB |192,9MiB |4,882s |16 |

Cada caso completó50 publicaciones/150 claves con comprobación de longitud, retirada de sustituidas y DELETE+HEAD final sin errores. Se observaron30s de reposo y5s después de la limpieza. Hay una sola ejecución por configuración: los tiempos no demuestran que384MiB sea más rápido. Tampoco se debe presentar la comparación como531→193MiB: el pico histórico usa un volumen caliente y otro flujo; aquí se comparan instancias limpias con tráfico S3 directo, sin Express/Prisma/Sharp.

El perfil de heap identifica128MiB reservados en los ocho buffers de escritura de16MiB de LevelDB2 y unos80MiB en dos conjuntos de buffers de eventos del filer. Se confirmaron las rutas de asignación y el código de [LevelDB2 en4.47](https://github.com/seaweedfs/seaweedfs/blob/4.47/weed/filer/leveldb2/leveldb2_store.go) y [los buffers de eventos](https://github.com/seaweedfs/seaweedfs/tree/4.47/weed/util/log_buffer). Son reservas del heap; no toda su capacidad corresponde a páginas físicas ocupadas. En la configuración por defecto, tras un GC forzado al terminar, el heap asignado pasó aproximadamente de430 a306MiB, mientras la medida equivalente a Docker permanecía cerca de256MiB. Esto evita confundir capacidad reservada, basura pendiente, pools reutilizables y RSS.

El objetivo192MiB quedó por debajo del heap retenido y provocó más de1.700 ciclos de GC; que reduzca más el RSS no lo convierte en una elección eficiente.384MiB es un candidato de ensayo más equilibrado: redujo el pico de esta comparación aproximadamente un25% sin la proliferación de ciclos. `GOMEMLIMIT` no reserva384MiB ni fija un máximo RSS: orienta al runtime de Go. No se ha aplicado al servicio de la aplicación, ni se consideran validados256MiB como límite duro para producción. Siguiente: medir el candidato en el flujo completo y sostenido con el volumen real antes de decidir cuotas.

Los perfiles con GC forzado se obtuvieron solo después de las medidas de carga, para distinguir retención; no se usan como ahorro natural del ensayo. Se verificó la etiqueta UUID de propiedad antes de parar cada contenedor temporal y retirar su volumen. Los tres contenedores y sus volúmenes se eliminaron. El servicio original permanece en marcha con `mini -dir=/data`, sin límite de memoria nuevo. No se activaron puertos de debug ni métricas en ese servicio.

Evidencia: [resumen](evidence/2026-10-18-ram/summary.json), [estadísticas de perfiles](evidence/2026-10-18-ram/profiles-summary.json) y [hashes de muestras/perfiles comprimidos](evidence/2026-10-18-ram/manifest.json). Scripts exploratorios y originales locales en `apps/backend/.bench-results/ram-diagnosis/`, excluidos de Git. No hay cambios de código productivo ni de configuración persistente por esta revisión diagnóstica; la aplicación posterior autorizada se registra a continuación.

## Optimización aplicada y repetición integrada — 2026-10-18

Petición expresa: aplicar la caché desactivada de Sharp y el objetivo Go de384MiB, repetir el flujo completo y explicar código/resultados. `mediaImageWorker.ts` pasa de `sharp.cache({ memory:32, files:0, items:100 })` a `sharp.cache(false)` dentro del hijo. Se conserva `sharp.concurrency(1)`: cada hijo procesa una imagen y sus variantes secuenciales, sin reutilización entre trabajos. La caché de operaciones podía retener recursos del decodificador progresivo entre variantes;32MB no era un límite de RAM nativa.

`docker-compose.media.yml` añade `environment.GOMEMLIMIT: 384MiB`. Go ajusta su recogida de basura hacia ese objetivo de memoria gestionada; no es una reserva ni un máximo RSS. Compose recreó SeaweedFS4.47 conservando `mini -dir=/data`, el volumen existente `weblogros_media_windows_data`, credenciales privadas y loopback. Se comprobó el valor efectivo sin guardar el resto de Env. No hay cuota Docker de memoria, nuevos servicios ni cambios en entradas, compresión, variantes, concurrencia, plazos o esquema de DB.

Dos ejecuciones completas de50 imágenes cada una, mismo corpus determinista de10MB/24MP y ocho tandas. Primera UUID `1d93f9d3-6197-4abc-91c8-5a85643ce364`; segunda `2ec4a908-facc-4c82-9054-33dfe976784b`, sin reiniciar SeaweedFS ni forzar GC entre ellas. No se vació el volumen para obtener una cifra favorable. El backend/actor sí es nuevo en cada ejecución, como en la referencia.

| Medida | Referencia anterior | Ajustada, primera | Ajustada, segunda en caliente |
| --- | ---: | ---: | ---: |
| Imágenes / variantes |50 /150 |50 /150 |50 /150 |
| Sharp conjunto, RSS muestreado |948,7MiB |446,0MiB |445,2MiB |
| Sharp, cota conservadora de máximos solapados |998,7MiB |480,2MiB |479,7MiB |
| Backend RSS máximo |185,7MiB |187,2MiB |187,7MiB |
| SeaweedFS, memoria máxima Docker |530,5MiB |271,4MiB |353,8MiB |
| SeaweedFS, mayor muestra de CPU Docker |24,36% |184,38% |255,16% |
| Temporal lógico máximo |117,8MiB |117,8MiB |117,8MiB |
| Sharp p95 / máximo |794 /899ms |785 /822ms |770 /887ms |
| Doce trabajos tras liberar la cola |8,260s |7,635s |8,759s |
| Salud HTTP/DB |251/251200 |246/246200 |256/256200 |
| Salud p95 / máximo |9,2 /100,7ms |8,9 /84,6ms |11,2 /50,1ms |

Sharp reduce su pico conjunto aproximadamente un53% en ambas pasadas. El cambio es consistente con el diagnóstico aislado; el tamaño/dimensiones de las150 variantes coincide exactamente con la referencia en cada pasada. Este contraste verifica el perfil de bytes, no hashes de contenido de todas las variantes. JPEG85, PNG sin paleta, orientación, transparencia y retirada de metadatos no cambian.

SeaweedFS reduce el pico observado un49% en la primera y un33% en caliente frente a la referencia histórica, pero la memoria aumenta entre pasadas. **No queda acreditada estabilización ni suficiencia de256MiB.** El servicio se recreó para aplicar Go antes de la primera pasada, mientras la referencia anterior estaba caliente: no atribuir todo el descenso exclusivamente a GOMEMLIMIT ni extrapolarlo a producción. La segunda pasada evita presentar solo la muestra posterior al reinicio.

Las muestras de CPU del almacén suben;100% equivale aproximadamente a un núcleo y255% a2,55 núcleos durante el intervalo de Docker, no CPU sostenida ni un total de CPU del ensayo. El GC más frecuente es un coste plausible del ajuste, coherente con el diagnóstico, pero estas muestras no prueban causalidad ni cuantifican por sí solas todo ese coste. Los tiempos integrados permanecen similares, sin demostrar una mejora estadística de velocidad. Se conservan muestras sin forzar recogidas de basura.

**Flujo funcional PASS en ambas ejecuciones; presupuesto REVISAR en ambas, exclusivamente por SeaweedFS>256MiB.** Se mantuvo ese umbral del runner: no se aumentó para obtener PASS.2 activos +10 pendientes, rechazo temprano503, FIFO, plazos, lectura de la imagen asociada, referencias READY y ciclo completo de los100 trabajadores PASS. Se retiraron las151 claves propias por ejecución mediante DELETE+HEAD, los temporales y fixtures de DB; recuentos antes/después idénticos y actor cerrado con código0. El runner devuelve2 por revisión de recursos.

Verificación adicional recién ejecutada: build PASS, ejecutor11/11 y API13/13 (incluido test padre), sin omisiones. La API cubre permisos antes de304, sustitución/retirada de anterior, desconexiones y cierre. No se presentan las155 comprobaciones históricas como reejecutadas. Backend habitual restaurado; repetir en servidor y con carga sostenida/mixta antes de cerrar dimensionamiento. El corpus/frontal/QA visual siguen pendientes en7.10.

Evidencias: [comparación](evidence/2026-10-18-optimized/comparison.json), [primera ejecución](evidence/2026-10-18-optimized/initial/report.json), [segunda ejecución](evidence/2026-10-18-optimized/warm/report.json). Cada carpeta contiene configuración efectiva sin secretos, trazas gzip y manifiesto SHA-256. Locales ignorados: `.bench-results/local-optimized/` y `.bench-results/local-optimized-warm/`. Para repetir el comando de esta ficha, usar `--batches 8` y un `--output` nuevo; una segunda ejecución conserva caliente el mismo almacén. El procedimiento, runner e instrumentación no se han cambiado para esta optimización.
