# 7.10 — Receptor de archivo por streaming

Fecha: 2026-10-15. **IMPLEMENTADO Y VERIFICADO LOCALMENTE: 14/14 PRUEBAS PASS.** Bloque aislado anterior al enlace con admisión/Prisma. El usuario pide explicar archivos, funciones y arquitectura, conservando comprensión antes de pasar al siguiente bloque.

## Sitio en la arquitectura

El servicio `receiveMediaUpload` transforma un flujo multipart en un archivo temporal cerrado. No es una ruta Express ni admite un trabajo por sí mismo. El llamador futuro debe autorizar el destino y reservar capacidad antes de invocarlo.

```text
Ruta/controlador futuro
  autoriza destino
  -> admitReceivingMediaJob                existente; reserva capacidad
  -> receiveMediaUpload                   pieza de este bloque
       Readable -> Busboy -> pipeline -> input.tmp
  -> persistir referencia + marcar QUEUED  enlace pendiente
  -> toma/ejecutor                         existentes; disparador pendiente
```

El receptor no importa Prisma, configuración global ni Sharp. El trabajo de red/disco queda separado de las transacciones de DB y de los procesos que decodifican imágenes.

## Archivos y funciones

| Archivo nuevo en apps/backend/src/lib | Responsabilidad |
| --- | --- |
| mediaUploadProtocol.ts | Esquemas Zod de opciones/multipart, códigos seguros y clase MediaUploadError |
| mediaUploadReceiver.ts | Función pública receiveMediaUpload y helpers de streaming, cierre y limpieza |
| mediaUploadReceiver.test.ts | Pruebas con Busboy/filesystem reales, Readable sintéticos e imágenes generadas |

Firma implementada:

```ts
receiveMediaUpload(
  source: Readable,
  headers: IncomingHttpHeaders,
  options: { temporaryRoot: string; jobId: string; signal?: AbortSignal },
): Promise<MediaUploadResult>
```

El resultado es `{ directory, inputPath, bytes, inputFormat }`. Las rutas son internas. `Promise<MediaUploadResult>` expresa que el resultado llegará después de operaciones asíncronas; el llamador debe hacer await antes de intentar confirmar la recepción en DB.

Helpers principales:

- `detectInputFormat`: compara la firma PNG/JPEG con los primeros bytes.
- `createImageGuard`: crea un Transform que cuenta bytes, retiene como máximo ocho bytes de prefijo y deja pasar los fragmentos al writer; rechaza exceso/formato ajeno.
- `waitForClose`: espera el evento close, no solo la propiedad destroyed.
- `isOwnedJobDirectory`: verifica raíz/directorio canónicos, UUID y ausencia de symlink en esos componentes antes de actuar.
- `cleanOwnedWorkspace`: retira solo input.tmp creado por esta llamada y hace rmdir de la carpeta vacía. No usa borrado recursivo ni elimina restos ajenos.
- `fail`, interno a receiveMediaUpload: conserva la primera causa y programa abort con setImmediate para dejar terminar el ciclo interno de Busboy.

La raíz es configuración confiable; se rechaza symlink en su componente final y se usa realpath como raíz efectiva. No se inspeccionan todos los ancestros de la ruta configurada como una política de prohibición de symlinks en toda la cadena.

## Contrato y conceptos de código

- `Readable`: origen de bytes. El archivo llega por fragmentos; el servicio no construye un Buffer con toda la imagen.
- Busboy: interpreta el formato multipart y entrega el flujo del archivo `image`; no decodifica imágenes.
- `pipeline`: conecta lectura y escritura, propaga errores y aplica backpressure. Si el disco escribe más despacio, el origen no continúa acumulando todo en RAM.
- Ruta privada: raíz configurada y UUID del trabajo; se ignora el nombre original enviado por el cliente. `wx` impide sobreescribir una entrada existente.
- Cierre: el resultado solo se devuelve después de que las escrituras terminen y cierren sus recursos. En error/cancelación, la limpieza ocurre después del cierre confirmado.

El límite de 10.000.000 bytes es inclusivo. La firma PNG/JPEG es una comprobación de cabecera de bytes, no una validación completa: imagen dañada, APNG, píxeles y decodificación permanecen en el ejecutor Sharp. No anunciar una imagen válida/lista a partir de la firma del receptor.

## Pendientes fuera de este módulo

No conecta la ruta HTTP de producto ni `server.ts`. Falta el controlador que enlace autorización/admisión, señal/plazo de recepción, cierre y terminal durable, referencia del temporal al encolar y política de limpieza. Falta aplicar presupuesto/margen de disco antes de admitir, disparador de cola, recuperación y el recorrido S3/asociación. La señal de cancelación de este módulo no es cancelación distribuida.

El retorno del receptor tampoco es el estado QUEUED: el llamador debe confirmar la escritura duradera en DB. Si falla esa confirmación, no borrar automáticamente un archivo cuyo commit pueda ser incierto. Ningún resultado de este bloque libera por sí solo una plaza RECEIVING.

`MediaUploadError` hereda de Error, no de AppError; el controlador futuro deberá traducir el código/status/mensaje al contrato HTTP. No serializar el objeto completo: cleanupPendingDirectory es un dato privado que debe persistirse o reconciliarse, no entregarse al navegador.

La fuente debe emitir close al terminar/destruirse, como los Readable por defecto usados en pruebas. Es una precondición del llamador, no una comprobación que el servicio pueda hacer por una API pública estable. Un Readable arbitrario con emitClose:false o sin cierre automático no está soportado y podría dejar la espera sin resolver. La futura integración debe usar IncomingMessage estándar y verificar su ciclo de cierre. Los rechazos previos a la pipeline dejan el source sin consumir; el adaptador HTTP deberá drenarlo/cerrarlo y resolver la admisión de forma segura.

## Validación ejecutada

Windows, Node **24.14.0**, Busboy **1.6.0**, Sharp **0.35.5** solo para generar fixtures PNG/JPEG en pruebas. El receptor no importa Sharp.

```powershell
# Desde apps/backend
npm run build
node --test dist/lib/mediaUploadReceiver.test.js
# Desde la raíz
git -c core.safecrlf=false diff --check
```

Build PASS, **14 pruebas PASS, cero omitidas**, diff-check PASS. La primera ejecución restringida omitió el junction de Windows; ejecución permitida sobre temporales propios completó ese caso. No se modificaron restricciones del receptor ni de las pruebas para sustituirlo por una comprobación ficticia.

Cobertura: firmas PNG/JPEG frente a MIME/filename engañosos; 10.000.000 y 10.000.001 bytes; formato ajeno; formulario truncado, sin archivo, campo incorrecto, campos extra y segundo archivo; pre-abort y validación sin consumir fuente; cancelación con _destroy demorado y close confirmado; error/cierre prematuro; EEXIST y dos llamadas al mismo UUID; dos UUID simultáneos; conservación de archivo ajeno con cleanup pendiente; root junction rechazado. Las fixtures tienen alcance canónico comprobado antes de su retirada.

Durante la implementación, propagar la cancelación en microtask desde el ciclo de Busboy produjo un fallo nativo de Node en el caso de campo de archivo incorrecto; se aisló y corrigió usando setImmediate. También se corrigió el mapeo de errores de Transform para conservar UNSUPPORTED_FORMAT en vez de reemplazarlo por error de disco. Se retiraron logs de diagnóstico antes de la validación final. La explicación inicial de queueMicrotask del prototipo no se aplica a este receptor: su mecanismo verificado es setImmediate.

Revisión independiente estática PASS con las precondiciones de fuentes y límites de integración registrados. No hubo consulta/escritura de DB, migración, arranque de Docker ni servicios nuevos en este bloque. La suite usa Readable y disco reales; no prueba todavía desconexión HTTP de IncomingMessage ni almacenamiento S3. Sin medición RSS/carga, decodificación de imágenes del usuario ni imágenes reales en frontend.

Siguiente acción: explicar firma/Transform/pipeline/errores y esperar comprensión antes de enlazar receptor con admisión, referencia temporal y confirmación QUEUED. T05.01 continúa parcial; no se cierra 7.10.

Continuación 2026-10-15: usuario comprende await y pide el enlace. [Fachada recepción/Prisma](MEDIA-UPLOAD-INTAKE.md) implementada/probada14/14, con contrato estricto de claim y migración22; el receptor aislado no se modificó. Su retorno cerrado se integra ahora con la confirmación de QUEUED. Pausa vigente: comprender el código del enlace antes de controlador/HTTP.
