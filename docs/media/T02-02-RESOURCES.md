# 7.10 / T02.02 — Presupuesto provisional y plan de medición

Fecha de diseño: 2026-10-12. **Actualización 2026-10-18: carga integrada local medida mediante [ensayo repetible](MEDIA-LOAD-TESTING.md); provisiones pendientes de revisión.** El resto de esta ficha conserva la foto y las previsiones históricas del diseño. Sus menciones a implementación/mediciones pendientes no describen el estado actual: Sharp y el flujo de catálogo ya están integrados. La medición local no acredita recursos del servidor definitivo ni cierra T04/T05/T08 globales.

Actualización posterior del2026-10-18: aplicados `sharp.cache(false)` en el hijo y `GOMEMLIMIT=384MiB` en Compose. Dos repeticiones completas50/50: Sharp446,0/445,2MiB conjuntos; cota480,2/479,7MiB. SeaweedFS271,4/353,8MiB, todavía supera256MiB y aumenta en caliente, con picos de CPU mayores. FuncionalPASS, presupuestoREVISAR; no se modifica la provisión ni se acredita estabilización. [Comparación y evidencias](MEDIA-LOAD-TESTING.md#optimización-aplicada-y-repetición-integrada--2026-10-18). La medición siguiente es la referencia anterior a estos ajustes.

## Foto del entorno de desarrollo

**Medición integrada2026-10-18:**50/50 imágenes correctas;2+10 y rechazo503 verificados. Sharp alcanzó948,7MiB conjuntos muestreados y998,7MiB de cota conservadora de máximos solapados, dentro de1GiB con margen estrecho. SeaweedFS llegó a530,5MiB, por encima de la provisión256MiB;512MiB tampoco queda acreditado. Backend120,0MiB en reposo inicial/185,7MiB de pico; temporal117,8MiB. Resultado funcionalPASS, presupuestoREVISAR. [Entorno, trazas, límites y conclusiones](MEDIA-LOAD-TESTING.md#resultado-verificado--2026-10-18-piloto-windows). No se modifica la provisión ni se valida producción automáticamente; queda pendiente revisar memoria y repetir sostenidamente en el servidor.

Lecturas de solo lectura del Windows local:

| Recurso | Observación |
| --- | --- |
| RAM visible | 34.151.231.488 bytes, aproximadamente 31,81 GiB |
| RAM libre en ese instante | 13.933.256.704 bytes, aproximadamente 12,98 GiB |
| Procesadores lógicos | 20 |
| Disco C: libre | 92.116.205.568 bytes, aproximadamente 92,12 GB |
| Docker | Motor no disponible durante esta revisión; no se arrancó para este bloque |
| SeaweedFS | Sin medición nueva; la muestra histórica de reposo fue 69,25 MiB el 2026-09-28 |

CIM inicialmente requirió ejecución fuera del sandbox para poder consultar RAM/CPU. El disco se consultó con `Get-PSDrive`. Ninguna consulta cambia RAM asignada, cuotas, contenedores, volúmenes o archivos del almacén. La RAM libre es variable. Los procesos Node existentes no se identificaron como baseline de la app; todavía no se dispone de baseline completo frontend/backend/DB.

Estas cifras no acreditan recursos del CT/servidor ni de la VM Docker. Deben repetirse en el entorno de ejecución correspondiente antes de habilitar imágenes allí.

Unidades: MB/GB son decimales para archivos; MiB/GiB son binarios para reservas de memoria/disco. 1 GiB = 1.073.741.824 bytes.

## Presupuesto inicial para construir y medir el piloto

Es una elección provisional de ingeniería, **no un pico medido ni un límite de consumo garantizado**. No se aplica como límite Docker ni se cambia ahora el comportamiento del producto.

| Componente | Reserva/objetivo inicial | Qué cubre y qué falta comprobar |
| --- | --- | --- |
| Procesamiento de media | 1 GiB adicional, conjunto de los dos puestos | Decodificación, buffers, variantes y memoria nativa/caché. Medir el conjunto, no 1 GiB por imagen. No incluye baseline de la app |
| SeaweedFS local | 256 MiB de provisión | Servicio S3, cachés y operaciones del piloto. La muestra histórica no demuestra que esta provisión baste bajo carga |
| Margen adicional de media | 256 MiB | Variación durante recepción/publicación y medición. No sustituye el margen propio del SO y servicios existentes |
| Total de RAM a reservar para media | **1,5 GiB adicional al entorno existente** | Revalidar con frontend/backend/DB y Docker en marcha; ni heap de V8 ni caché Sharp representan este total |
| Área temporal de trabajo | **1 GiB de presupuesto lógico inicial** | Entradas recibidas/en espera/activas, salidas intermedias y restos de limpieza. No representa capacidad permanente de SeaweedFS |
| Margen del sistema de archivos temporal | **1 GiB libre fuera del espacio proyectado de trabajo** | Evitar llenar el disco compartido con la app. La admisión deberá comprobar espacio proyectado/reservado; consulta aislada del espacio libre no coordina peticiones simultáneas |

No son cuotas nuevas por jugador/equipo ni permiten más de 2 trabajos activos y 10 pendientes. El presupuesto del temporal incluirá restos y recepciones reservadas: al agotarse, la admisión debe detenerse hasta recuperar espacio, conservando imágenes vigentes. El mecanismo transaccional y respuesta concreta se diseñan en T02.03/T02.04 y se implementan en T05.01/T05.06. No abrir recepciones ilimitadas antes de reservar una plaza/capacidad. Su contabilidad debe mantener el máximo acordado de 12 trabajos y 10 puestos de espera; el reparto por estados corresponde al siguiente diseño.

El almacén permanente se calcula por imágenes conservadas en [MEDIA-CAPACITY](../MEDIA-CAPACITY.md), más metadatos/espacio físico real de SeaweedFS. El presupuesto temporal no limita ni incluye ese crecimiento, especialmente borradores y propuestas rechazadas conservadas. La capacidad física permanente definitiva, réplicas y copias se concretan al desplegar.

## Por qué 120 MB y 192 MB no bastan como presupuestos

- Entradas temporales de los 12 trabajos: `12 × 10.000.000 = 120.000.000 bytes`, **120 MB**. Se incluyen aquí las transferencias reservadas dentro del máximo acordado; el algoritmo de reserva aún no existe.
- Un fotograma de 24 MP expandido a RGBA: `24.000.000 × 4 = 96.000.000 bytes`, **96 MB**. Dos representan **192 MB** como aritmética de esos píxeles, no como máximo del procesador.
- Además hay buffers, códecs, orientación/conversión, Node, conexiones, metadatos y salidas. Restos de trabajos fallidos pueden acumularse más allá de las 12 entradas vivas; contarlos dentro del presupuesto y frenar admisión si la limpieza falla.

La reserva de 1 GiB temporal deja margen respecto a los 120 MB de entradas, pero por sí sola no asegura ningún máximo: exige admisión, control del área y limpieza. La reserva RAM de 1,5 GiB es un punto inicial para medir; si no basta, se revisará antes de habilitar el uso real, sin presentar un cambio de límites del producto como decisión ya aprobada.

## Ajustes iniciales previstos del procesador

Propuesta técnica para implementar y contrastar con T05:

- Máximo de dos trabajos de imagen globales; cada puesto conserva su turno hasta terminar todas las variantes y su fase de publicación coordinada. Variantes secuenciales por trabajo, evitando convertir dos trabajos en seis transformaciones simultáneas.
- `sharp.concurrency(1)` por proceso de procesamiento como inicio conservador: limita hilos de libvips por imagen, **no** el número global de trabajos ni todos los hilos del proceso/códecs.
- Diseño inicial: `sharp.cache({ memory: 32, files: 0, items: 100 })`; `memory:32` no limitaba el RSS ni toda la memoria nativa. **Configuración vigente desde 2026-10-18: `sharp.cache(false)` en el hijo**, tras diagnosticar retención de recursos del decodificador entre variantes. Se mantiene `sharp.concurrency(1)` y el máximo global de dos trabajos. [Resultados integrados](MEDIA-LOAD-TESTING.md).
- Entradas en espera permanecen comprimidas en disco; decodificación solo al ocupar un puesto activo. No ejecutar Sharp en un `.map` de toda la cola.
- Aislamiento/cancelación real del procesador se definen en T02.03; limitar heap de Node no limita automáticamente memoria nativa. El timeout acordado de 30 s debe detener la ejecución, no solo abandonar una Promise.

Fuente primaria: [propiedades globales de Sharp, caché y concurrencia](https://sharp.pixelplumbing.com/api-utility/). El diseño inicial se conserva como histórico; los ajustes vigentes ya se aplican en el servicio integrado.

## Plan operativo de medición y criterio de revisión

| Etapa | Qué ejecutar y registrar | Qué permite cerrar |
| --- | --- | --- |
| T04, servicio S3 | SeaweedFS en reposo y durante Put/Get/Head/Delete y dos publicaciones; RSS/memoria del contenedor, CPU, disco físico/objetos/metadatos y comportamiento del borrado | Consumo observado del almacenamiento. Recreación/persistencia ya verificadas, no repetir por esta ficha |
| T05.02/T06.01, transformación | Corpus autorizado con JPEG y PNG difíciles, transparencia, orientación/perfiles y fronteras. Verificar bytes/dimensiones reales; dos entradas válidas máximas simultáneas, variantes acordadas y sin originales definitivos | Pico RSS conjunto del procesador, tiempo por trabajo/variantes, bytes de cada salida y calidad visual. Color uniforme del ensayo anterior no acredita esta carga |
| T05.03/T08.02, integración | Backend/frontend/DB de pruebas presentes, 2 activos + 10 pendientes, cola llena, transferencia interrumpida y cancelación; muestreo RAM/CPU/disco temporal durante todo el ciclo | Topes globales, tiempos 180/30 s, ausencia de procesado de pendientes y coherencia con reserva/presupuesto. Registrar baseline y pico, no solo aumento respecto a un proceso en reposo |
| T05.06/T08.02, limpieza | Éxito/fallo/cancelación, restos tras caída y error de borrado; medir máxima ocupación temporal y posterior retirada | Verificar que restos cuentan, la admisión frena al agotar espacio y no borra archivos referenciados. Basura pendiente no queda fuera de la contabilidad |

Muestrear RSS/memoria nativa y memoria de contenedores; `heapUsed` solo no representa el consumo. Para capturar picos breves usar además máximo de proceso cuando el entorno lo permita, y registrar frecuencia/limitaciones del muestreo. Medir el espacio temporal por directorio y el disco Docker por separado; no confundir bytes lógicos de objetos con espacio físico liberado. No exponer credenciales ni metadatos personales en evidencias.

Criterios del piloto: pico observado del procesamiento dentro de 1 GiB, SeaweedFS dentro de 256 MiB, margen adicional y RAM suficiente para el resto del entorno; temporales/proyección dentro del presupuesto de 1 GiB y 1 GiB libre de sistema de archivos fuera de esa proyección. Procesamiento válido debe terminar antes del plazo acordado. Si se exceden las provisiones, medir causa y reajustar configuración/presupuesto; si afecta a límites de producto, consultar al usuario. Estos son objetivos de aceptación pendientes de medir, no garantías universales.

## Estado al cerrar este punto

T02.02 **DONE como diseño/viabilidad local**: versiones fijadas, configuración privada y persistencia probadas, compatibilidad Busboy/Sharp, procedencia/licencias de paquetes, presupuesto provisional y plan de medición registrados. Licencias del conjunto nativo de producción se revisan en despliegue. T02 global sigue EN CURSO por T02.03/T02.04; T04 global por carga real; T05 pendiente. Siguiente acción: explicar recursos y esperar comprensión antes de diseñar trabajos/recuperación.
