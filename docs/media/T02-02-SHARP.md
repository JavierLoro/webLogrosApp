# 7.10 / T02.02 — Viabilidad del procesamiento con Sharp

Fecha: 2026-10-12. **Sharp instalado y ensayo aislado 11/11 PASS; procesador integrado pendiente de T03/T05.** El usuario confirmó comprender la recepción Busboy antes de iniciar este bloque.

Actualización 2026-10-18: esa frase describe el ensayo inicial. El ejecutor ya está integrado con HTTP/Prisma/S3; el hijo usa `sharp.cache(false)` y `sharp.concurrency(1)`. La [medición de carga](MEDIA-LOAD-TESTING.md) recoge el cambio de memoria. El resto de esta ficha conserva el alcance histórico de compatibilidad.

## Instalación y entorno comprobados

- `sharp@0.35.5` fijado en el package/lockfile backend, con dependencias opcionales para cargar los binarios. Tipos incluidos; no se instala `@types/sharp`.
- Runtime observado: Node 24.14.0, Windows x64; Sharp 0.35.5, libvips 8.18.7, libpng 1.6.58.
- El registro npm declara Node >=20.9 y licencia Apache-2.0. El paquete instalado `sharp` y el paquete nativo `@img/sharp-win32-x64` incluyen `LICENSE` Apache-2.0; las declaraciones TypeScript incluyen aviso MIT. Esto no es un inventario completo de licencias de todos los códecs/libvips incorporados: conservar/revisar sus avisos al preparar despliegue. Compatibilidad de Linux/producción pendiente de su propio entorno.
- `npm run build` PASS. Una primera compilación detectó una referencia incorrecta al namespace de tipos: se corrigió a `import { type OutputInfo }` según los tipos publicados por esta versión, sin cambiar la configuración del proyecto.

## Ensayo y resultados

Código: `apps/backend/src/experiments/sharpCompatibility.test.ts`. Imágenes creadas por código en memoria; no fotografías personales, originales en disco, subida HTTP, consultas DB ni objetos S3. `variantsForProbe` es un prototipo privado del ensayo y no se importa desde `server.ts`.

| Caso | Resultado |
| --- | --- |
| JPEG con orientación EXIF 6 | PASS: 80×40 pasa a 40×80; metadatos de entrada retirados |
| EXIF/XMP/ICC sintéticos presentes en entrada | PASS: ausentes en salida; orientación ausente después de aplicarla |
| Logo PNG 1024×512 con alpha | PASS: 512×256 y 128×64, transparencia conservada y PNG RGBA sin paleta |
| Color Display P3 | PASS: normalización a sRGB, ICC retirado y canales recuperados con tolerancia de dos niveles sobre 255 |
| Logro JPEG 1600×800 | PASS: 1280×640, 640×320, 320×160; proporción completa |
| Avatar ya cuadrado 512×512 | PASS: 256×256 y 96×96; rectangular exige encuadre previo |
| Fuente 20×10 | PASS: sin ampliación y una sola variante final |
| JPEG 6000×4000, exactamente 24 MP | PASS: aceptado y transformado |
| JPEG 6000×4001, 24.006.000 píxeles, menos de 10 MB | PASS: rechazado por píxeles |
| WebP, GIF, SVG válidos; contenido inválido y JPEG truncado | PASS: entradas rechazadas |
| APNG sintético válido de dos fotogramas | PASS: guardia de bloque `acTL` rechaza la animación |
| Buffer mayor de 10.000.000 bytes | PASS: rechazado antes de decodificar |

Son 11 pruebas automatizadas; algunas agrupan varias comprobaciones de la misma regla. El recorrido usa JPEG calidad 85 y PNG `palette:false`. `autoOrient()` y conversión sRGB ocurren antes de la salida sin `keepMetadata`/`withMetadata`. Para fuentes pequeñas se deduplican resultados por dimensiones. El avatar de ensayo ya está encuadrado: no se elige un recorte automático que sustituya el encuadre futuro del usuario.

### Hallazgo sobre PNG animado

Con esta versión y el APNG de dos fotogramas generado por el ensayo, Sharp informa `format=png, pages=1`. Por eso **comprobar solo pages no detecta toda animación PNG**. El ensayo recorre bloques PNG reales y rechaza `acTL`, en lugar de buscar esos cuatro caracteres dentro de bytes comprimidos. T05.02 deberá incorporar esta condición a su validación completa. El lector de bloques del ensayo no sustituye todas las comprobaciones de integridad y límites del procesador final.

### Repetición

Desde `apps/backend`:

```powershell
npm run build
node dist/experiments/sharpCompatibility.test.js
```

Observado: build PASS; 11 pruebas, 11 PASS, 0 FAIL. La ejecución directa usa `node:test` en el mismo proceso. No se ha medido RSS/disco pico ni dos trabajos máximos concurrentes; el JPEG de 24 MP es de color uniforme y no representa una carga difícil.

## Límites de esta evidencia

Se probó transformación por código, no el recorrido de la aplicación. Faltan modelo de trabajo, entrada desde temporal, permisos/admisión, publicación y limpieza en caso de caída. T05.02 y T06.01 deben ampliar el corpus, revisar calidad visual JPEG 85, PNG detallado/16 bits, orientación y perfiles variados, IPTC/GPS reales y corrupción adicional. La ausencia de campos de metadatos en las variantes sintéticas no acredita por sí sola todos esos casos.

Al finalizar este ensayo T02.02 seguía pendiente de presupuesto/medición. Actualización posterior del mismo día: usuario confirmó comprensión y se cerró T02.02 como diseño/viabilidad local con [provisiones y plan de medición](T02-02-RESOURCES.md). La carga real permanece pendiente; el ensayo por sí solo no cierra T03/T05 ni acredita capacidad.

Fuentes primarias: [instalación](https://sharp.pixelplumbing.com/install/), [constructor y límite de píxeles](https://sharp.pixelplumbing.com/api-constructor/), [orientación](https://sharp.pixelplumbing.com/api-operation/#autoorient), [salida y metadatos](https://sharp.pixelplumbing.com/api-output/). Versiones/licencia del paquete consultadas con npm y verificadas localmente.
