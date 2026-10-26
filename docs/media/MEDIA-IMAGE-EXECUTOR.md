# 7.10 — Ejecutor de imágenes con Sharp

Fecha: 2026-10-12. **IMPLEMENTADO Y VERIFICADO LOCALMENTE, sin integrar en HTTP, cola, PostgreSQL ni S3.** Petición expresa: montar el ejecutor y explicar el código, esperando comprensión antes del siguiente bloque. No se cierra T02.03 ni T05.02/T05.03.

Actualización 2026-10-18: el alcance anterior corresponde a la entrega inicial. El ejecutor ya participa en el flujo HTTP/Prisma/S3; se ha desactivado su caché de operaciones y repetido la [carga integrada](MEDIA-LOAD-TESTING.md#optimización-aplicada-y-repetición-integrada--2026-10-18). Las secciones históricas de esta ficha no sustituyen los documentos posteriores de runtime, recuperación y limpieza.

## Qué hace esta pieza

Recibe internamente `{ directory, kind }`. El directorio es temporal, creado/controlado por el backend, con un archivo `input.tmp`; nunca es una ruta enviada por el navegador. `kind` distingue `achievement`, `logo` y `avatar`.

```text
Controlador -> crea intento temporal -> arranca proceso Node
                                      -> trabajador ejecuta Sharp
                                      -> variantes + manifiesto
Controlador <- confirma cierre <- resultado del trabajador
             -> comprueba archivos -> devuelve resultado interno
```

No es otro contenedor ni un servicio permanente: cada ejecución crea un proceso Node hijo. Separarlo permite terminar sus hilos nativos al cancelar o agotar el tiempo. No representa un sandbox de seguridad del sistema operativo ni un límite de RAM total.

## Archivos y responsabilidades

| Archivo en `apps/backend/src/lib/` | Responsabilidad |
| --- | --- |
| `mediaImageProtocol.ts` | Tipos y validación Zod del contrato interno, límites y códigos seguros de error |
| `mediaImageProcessing.ts` | Lectura limitada, validación PNG/JPEG, orientación/color, transformación secuencial y escritura de variantes |
| `mediaImageWorker.ts` | Sharp en proceso separado; IPC, configuración de caché/hilos y salida tras comunicar resultado |
| `mediaImageExecutor.ts` | Directorio de intento, arranque, tiempos, cancelación, espera de cierre, validación del manifiesto y limpieza del intento fallido |
| `mediaImageExecutor.test.ts` | Integración con procesos reales e imágenes sintéticas |

El código tiene notas pedagógicas `// 📚`; [apuntes](../apuntes.md) explica los conceptos.

## Reglas aplicadas

- Entrada hasta **10.000.000 bytes** y **24.000.000 píxeles**, inclusive. Se limita también la lectura si crece después del `lstat`.
- PNG estático/JPEG por firma y decodificación real, sin fiarse de extensión o MIME. Rechazo explícito del bloque PNG `acTL`: Sharp puede presentar APNG como una página.
- Aplicar orientación EXIF y convertir a sRGB antes de la salida sin metadatos. JPEG calidad 85; PNG sin paleta, conservando transparencia.
- Logro: lado mayor 1280/640/320. Logo: 512/128. Avatar: cuadrado 256/96. No ampliar fuentes pequeñas ni producir variantes equivalentes. Variantes secuenciales por trabajador.
- Avatar: este bloque exige una entrada ya cuadrada. El encuadre interactivo elegido por el usuario y su contrato siguen pendientes; no se introduce recorte automático al centro.
- Trabajador con `sharp.concurrency(1)` y, desde 2026-10-18, `sharp.cache(false)`: cada hijo atiende una imagen y la caché de operaciones retenía recursos entre variantes, especialmente del JPEG progresivo. Sustituye el ajuste inicial `memory:32, files:0, items:100`. Estos ajustes no limitan toda la RAM nativa ni aplican el máximo global de dos trabajos. [Medición integrada](MEDIA-LOAD-TESTING.md).
- IPC intercambia mensajes/manifiesto, no los buffers ni metadatos personales. El trabajador del ejecutor no hereda DB/JWT/S3 ni argumentos de arranque arbitrarios del padre.
- Desarrollo ejecuta el trabajador TS con `ts-node/register`; el build usa JS compilado. Ninguno importa Prisma ni la configuración global de la aplicación.

## Terminación y limpieza

Hay una vigilancia técnica de **10 s para arrancar** y un plazo de **30 s desde `started`** para procesar. Las pruebas permiten acortar este último, nunca ampliarlo por encima de 30 s.

`AbortSignal` expresa cancelación explícita. El controlador guarda la primera causa, pide `SIGKILL` y espera el evento **`close`**. Pedir parada no equivale a confirmar parada. Un resultado recibido después de cancelar no se acepta; la promesa solo termina cuando el proceso ha cerrado. Si el sistema rechazase la señal y no cerrase el proceso, no se libera artificialmente la ejecución. No se ha probado ese fallo del sistema operativo.

Después del cierre, el controlador comprueba archivos, tamaños, nombres, formato, dimensiones y ausencia de duplicados. Cada intento usa su propia carpeta `variants-*`. Ante fallo/cancelación se verifica su ruta absoluta antes de borrarla; nunca se borra la entrada `input.tmp` ni una carpeta de resultados anterior. Si falla la limpieza, el error conserva internamente `cleanupPendingDirectory` para el futuro mecanismo de limpieza; no hay aún persistencia/reintento de limpieza.

La entrada sigue siendo **temporal**, no un original retenido como producto. Su retirada se conectará al ciclo del trabajo/asociación. Resolver el ejecutor significa «variantes temporales generadas», nunca `MediaJob.SUCCEEDED` o «imagen publicada».

Si pierde IPC con el padre, el trabajador sale con código 1. La prueba corta ese canal durante transformación y espera `exit` para confirmar su muerte; el ejecutor normal conserva IPC y espera `close`. En esta ejecución de Node/Windows la prueba inicial que esperaba `close` tras cortar IPC manualmente no recibió ese evento; se corrigió el criterio de esa prueba para comprobar terminación por `exit` y PID inexistente. Sin padre vivo pueden quedar temporales: reconciliación/limpieza durable pendiente, sin reejecución automática.

## Validación ejecutada

Windows, Node 24.14.0, Sharp 0.35.5. Comandos desde `apps/backend`:

```powershell
npm run build
node dist/lib/mediaImageExecutor.test.js
node --test --test-name-pattern="trabajador real genera" -r ts-node/register src/lib/mediaImageExecutor.test.ts
```

Build PASS. **11/11 pruebas compiladas PASS**, más **1/1 prueba dirigida de desarrollo TS PASS**:

1. Variantes reales de logro, manifiesto y PID inexistente al retornar.
2. Orientación, retirada de metadatos sintéticos y fuente pequeña sin ampliación/duplicación.
3. PNG transparente sin paleta y proporción conservada.
4. Avatar cuadrado 256/96; rechazo del encuadre rectangular.
5. Formato excluido, JPEG dañado, bytes/píxeles excesivos; conservación de entrada/resultados anteriores.
6. PNG con `acTL` rechazado aunque el lector indique una página.
7. Cancelación previa sin arrancar ni crear salidas.
8. Cancelación durante transformación real: cierre, limpieza del intento y conservación del anterior.
9. Timeout de trabajo real: cierre y limpieza; rechazo de plazo mayor de 30 s.
10. Caída inesperada del trabajador: fallo sin falso éxito y limpieza.
11. Pérdida de IPC: trabajador detenido; restos requieren futura recuperación.

Primer intento de pruebas bloqueado por `EPERM` al resolver el temporal del sandbox Windows. Repetidas fuera de ese sandbox, únicamente con fixtures y procesos propios. Una incompatibilidad de tipos (`windowsHide` no pertenece a `ForkOptions`) se corrigió antes del build PASS; no se añadieron casts para ocultarla. Todas las carpetas de prueba se retiran verificando su alcance absoluto.

Sin nuevas dependencias, migraciones, contenedores, datos personales, HTTP ni S3. Las pruebas sintéticas no acreditan capacidad de producción, dos máximos simultáneos, cola 2+10, calidad de corpus real ni recorrido completo de avatar/publicación.

## Próximo bloque, tras comprensión

Continuación posterior del 2026-10-12: el usuario comprendió el descarte tras cancelar y autorizó [la toma persistente de dos turnos](MEDIA-JOB-CLAIMS.md), ya probada sin enlazar Sharp. Siguiente pausa vigente: comprensión de esa toma antes de conectar ejecución/resultados. Admisión, transiciones, recepción y publicación siguen sus dependencias de [MEDIA-PLAN](../MEDIA-PLAN.md).

Fuentes primarias consultadas: [Node 24.14 — fork/IPC, close y kill](https://github.com/nodejs/node/blob/v24.14.0/doc/api/child_process.md), [entrada Sharp](https://sharp.pixelplumbing.com/api-constructor/), [salida Sharp y metadatos](https://sharp.pixelplumbing.com/api-output/), [caché/hilos Sharp](https://sharp.pixelplumbing.com/api-utility/). La separación en procesos y sus garantías concretas son decisiones de esta implementación, verificadas solo en los casos indicados.
