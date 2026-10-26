# Corpus y calidad de imágenes de logro

Entrega: 2026-10-27 (Europe/Madrid; ensayo iniciado el 26 y artefactos fechados en UTC). **Corpus y calidad de logros PASS local**, alcance T06.01/T06.02-logros y formatos/calidad de T08.02. Frontal pausado; logos, avatares y carga sostenida conservan sus pendientes y gates.

## Criterios de la verificación

- Fuentes sintéticas deterministas y arte aportado en el repositorio del usuario, sin descargas ni fotografía personal externa. Cada entrada conserva procedencia, receta, dimensiones, bytes y SHA-256. El arte existente no se modifica ni se integra en pantallas.
- Todos los casos pasan por HTTP, borrador propio, receptor productivo, cola, proceso Sharp y S3 privado. Los válidos continúan mediante publicación directa o propuesta aceptada/rechazada y lectura privada de las variantes. Los rechazados conservan borrador sin imagen y después se descartan como fixtures.
- Dimensiones calculadas según proporción y lado máximo 1280/640/320, sin ampliar ni duplicar fuentes pequeñas. Salidas sRGB de 8 bits, formato PNG/JPEG conservado, PNG sin paleta y sin EXIF/XMP/ICC/IPTC/orientación. Cada lectura privada debe coincidir en bytes y SHA con el asset asociado.
- Las ocho orientaciones EXIF tienen un oráculo independiente de esquinas de colores y dimensiones, incluyendo las cuatro reflexiones; no basta comparar con otra llamada a `autoOrient`.
- Referencia PNG sin compresión final al mismo tamaño, orientación, espacio de color y método de reducción. Para PNG se exige igualdad de píxeles y alpha. Para JPEG se registran MAE RGB, PSNR y SSIM de luminancia por bloques 8×8. PSNR nulo significa igualdad exacta, no medición ausente.
- Umbrales de aviso fijados antes del ensayo: JPEG PSNR <30 dB o SSIM <0,95 exigen revisión visual específica. No se modifica calidad85, límites ni umbrales para lograr PASS. Las métricas no sustituyen inspección visual ni prometen legibilidad de texto menor que la resolución de la variante.
- Paneles locales con referencia/salida, vista completa y recortes al mismo tamaño de píxel a 1× y 2× (ampliación por vecino más cercano). La inspección se documentará indicando qué paneles se revisaron y sus límites. No acredita QA del navegador ni del encuadre de tarjetas del frontal.
- Un runtime, base `127.0.0.1:55437/weblogros_ui` y S3 `127.0.0.1:8333/lockerboard-media-dev`, identidades verificadas antes de escribir. Fixtures con UUID, retirada DELETE+HEAD de objetos propios y conteos antes/después iguales; raíz temporal absoluta verificada antes de borrarla. Sin migraciones ni seed.

## Código

`apps/backend/src/experiments/media-quality/` contiene el generador `corpus.ts`, las métricas y el oráculo `metrics.ts`, sus pruebas, los paneles `review.ts` y el ejecutor `run.ts`. Es una herramienta de QA; no se importa desde el servidor productivo ni cambia el procesamiento.

Los fuentes grandes se regeneran en una raíz temporal exclusiva y se retiran al cerrar. Se conservan manifiesto, variantes leídas por HTTP, paneles 1×/2×, galería HTML local y reporte JSON. Las salidas incluyen entradas pequeñas/extremas, PNG de alta entropía sin padding, P3/CMYK/gris/16bits/paleta, EXIF1–8, límites 10MB/24MP y entradas inválidas. Logos/avatares tienen sus propias etapas pendientes.

## Repetición

Desde `apps/backend`, con el backend habitual detenido y los contenedores aislados existentes disponibles:

```powershell
npm run build
node dist/experiments/media-quality/metrics.test.js
$env:MEDIA_QUALITY_TEST='1'
node --env-file=../../.env.media.local --env-file=.env.ui-windows dist/experiments/media-quality/run.js --output ../../docs/media/evidence/NUEVA-CARPETA
Remove-Item Env:MEDIA_QUALITY_TEST
```

El directorio de salida debe ser nuevo: el ejecutor no sobrescribe evidencia anterior. No ejecutar simultáneamente con otra suite/runtime que comparta la base. El flag y la identidad del piloto son obligatorios; no se admite producción.


## Resultado verificado

[Reporte bruto](evidence/2026-10-26-quality-r3/report.json) · [resumen y pesos](evidence/2026-10-26-quality-r3/summary.json) · [manifiesto de fuentes](evidence/2026-10-26-quality-r3/corpus-manifest.json) · [galería local 1×/2×](evidence/2026-10-26-quality-r3/review.html) · [inspección visual registrada](evidence/2026-10-26-quality-r3/visual-review.json).

- **38/38 casos PASS:** 25 imágenes procesadas y 13 rechazos esperados. Los válidos recorren nueve publicaciones directas, ocho propuestas aprobadas y ocho rechazadas. Se generan y leen 71 variantes privadas: 26 PNG y 45 JPEG, con SHA y bytes verificados desde HTTP.
- Orientación EXIF1–8, incluyendo reflexiones, y dimensiones PASS mediante oráculo de esquinas independiente. Se admiten fuentes pequeñas/1×1 y proporciones extremas 24000×1/1×24000 sin ampliar ni duplicar; todas las salidas respetan su proporción y lado máximo.
- P3 y CMYK con ICC, gris progresivo, PNG de 16 bits y entrada con paleta admitidos. Salidas normalizadas sRGB de 8 bits, sin paleta ni EXIF/XMP/ICC/IPTC/orientación. El manifiesto confirma que las fuentes CMYK, 16bits y perfiles realmente contienen esas características.
- **26/26 variantes PNG con píxeles/alpha idénticos a la referencia normalizada y reducida.** Esto no promete conservar 16 bits ni el gamut completo de un perfil distinto: ambos se convierten según el contrato productivo.
- JPEG: mínimo PSNR **31,257 dB**, mínimo SSIM luma **0,962799**; cero avisos bajo los umbrales fijados. El peor PSNR corresponde al patrón de 24 MP a 320px, incluido en la inspección visual.
- Frontera exacta de 10.000.000 bytes/24.000.000 píxeles admitida para JPEG y PNG; 10.000.001 bytes recibe413 y 6000×4001 falla por píxeles después de202. APNG, JPEG/PNG truncados, PNG con datos finales/CRC dañado, WebP/GIF/TIFF/SVG, basura y vacío rechazados sin asociar imagen. Nombre y MIME del cliente se declaran JPEG también en casos PNG/otros formatos para comprobar inspección por contenido.
- Siete pruebas de la herramienta PASS ([log](evidence/2026-10-26-quality-r3/tool-tests.log)): métricas conocidas, oráculo EXIF, límites de recorte, baseline proporcional y estadísticas. Ensayo de compatibilidad Sharp11/11 PASS, build y seed:check PASS. Las 192 comprobaciones de la entrega anterior no se presentan como reejecutadas.

### Inspección visual

Se generaron 30 paneles y el Coordinator inspeccionó **13 paneles originales**, con recortes a 1× y 2×: horizontal/vertical, cuadrado alpha, arte oscuro propio, P3/CMYK, EXIF5/7, 16bits, paleta, alta entropía y ambas fuentes de frontera. Los nombres exactos están en `visual-review.json`. El resto de variantes tiene comprobaciones automáticas; no se afirma inspección manual de las 71.

JPEG muestra ligera suavización y mezcla de color en líneas muy finas a 320px/2×, sin pérdida material de composición; el arte oscuro conserva sombras y textura principal, con menos grano fino. El texto diminuto pierde legibilidad también en la referencia reducida: esta prueba no fija tipografía ni encuadre de tarjetas. PNG coincide con la referencia, incluido alpha. P3/CMYK se juzgan respecto a la normalización sRGB. PASS para este corpus y muestreo; no es gate visual de pantallas ni QA de navegador.

### Pesos medidos

25 imágenes completas, incluidas todas sus variantes; unidades decimales y p95 por rango más próximo:

| Conjunto | Mínimo | Mediana | p95 | Máximo |
| --- | ---: | ---: | ---: | ---: |
| Total | 91 B | 140.323 B | 3.488.075 B | 6.126.090 B |
| JPEG (15 fuentes) | 114.358 B | 140.246 B | 315.423 B | 315.423 B |
| PNG (10 fuentes) | 91 B | 748.664,5 B | 6.126.090 B | 6.126.090 B |

Las 71 variantes suman15.704.249 bytes. El máximo es `high-entropy-alpha`, sin padding; `boundary-png-transparent` suma3.488.075 bytes. Ambos superan el escenario hipotético pesado de3MB de MEDIA-CAPACITY. No son una distribución representativa del uso ni un máximo garantizado. Los presupuestos físicos se revisarán con carga sostenida/mixta; no se cambia compresión, límites ni cuotas para reducir estas cifras.

### Entorno, intentos y limpieza

Windows, Node24.14.0, Sharp0.35.5/libvips8.18.7; versiones completas en manifiesto. Preflight: ≈16,54GiB de RAM física libre sobre31,81GiB; solo los contenedores PostgreSQL/S3 existentes, sin backend/frontend de producto en3001/3000. El runtime de QA es único y los servidores HTTP usan puerto loopback efímero.

71 claves S3 propias retiradas con DELETE+HEAD; fixtures y fuentes temporales retirados tras comprobar su raíz absoluta. Conteos antes/después iguales:13 usuarios,2 equipos,14 membresías,19 logros,6 propuestas y5 owners históricos; cero borradores/jobs/assets/cleanups/journals. No se ejecuta seed, migración, recreación/borrado de volúmenes ni despliegue. El arte original del repositorio se conserva sin cambios; las variantes aquí almacenadas son evidencia de QA, no assets integrados en pantallas.

[Intentos](evidence/2026-10-26-quality-r3/attempts.json): los dos primeros quedaron INCOMPLETOS por errores de la herramienta de QA. Primero se corrigió un recorte fuera de borde; después, una referencia `fill` que alteraba el muestreo al usar dimensiones ya redondeadas. Se añadieron pruebas y la referencia utiliza ahora el mismo muestreo proporcional sin compresión final. No hubo cambio productivo, de calidad85 ni de umbrales. Ambos intentos confirmaron limpieza; sus manifiestos/reportes se conservan, y se retiraron solo sus paneles/variantes duplicados. La tercera ejecución es la evidencia válida.

El resumen se deriva del reporte bruto mediante `analysis.ts`; mediana par interpolada y p95 por rango más próximo, comprobados con valores conocidos. Generación y análisis también consumen recursos: este ejecutor **no es una medición de RAM/CPU del backend**.

## Cierre y siguiente dependencia

T06.01/T06.02 quedan cumplidos **solo para el corpus de logros de esta entrega**; T06 global mantiene logos/avatares pendientes. T08.02 acredita formatos/calidad del corpus local y sigue parcial por carga sostenida/mixta, servidor, otros destinos y QA de navegador. T08.01 sigue abierto por frontal/QA; no habilita logos.

Siguiente trabajo planificado: adaptar/reutilizar el ensayo de carga para incluir este corpus, especialmente PNG de alta entropía, y medir estabilidad de RAM/CPU/disco con tandas sostenidas/mixtas. Repetir en servidor cuando se retome ese entorno. La revisión administrativa de casos conservados sigue pendiente aparte; frontal y despliegue/backups conservan su pausa.
