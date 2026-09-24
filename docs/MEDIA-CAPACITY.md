# Phase 7.10 — Previsión de almacenamiento de imágenes

Fecha: 2026-09-22. Estimación de planificación, no medición ni cuota aprobada.

Fuente de alcance y tamaños principales/variantes acordados: [MEDIA-PLAN](MEDIA-PLAN.md). Variantes aceptadas el 2026-09-24. PNG/JPEG estáticos; avatar general y opcional por equipo, logo de equipo e imagen del logro. SeaweedFS inicial; R2 preferido a futuro. **Política confirmada el 2026-09-22: sin originales**, solo principal procesada y variantes necesarias. No se modifica infraestructura.

## 1. Qué se cuenta

- Una imagen de catálogo se almacena una vez con sus variantes, independientemente de cuántos jugadores consigan el logro. Las concesiones añaden registros en PostgreSQL, no copias de la imagen.
- El avatar general se guarda una vez por persona. Cada equipo con avatar específico añade una imagen; heredar el general no añade copias.
- Un logo por equipo; una imagen actual por logro. No se presupone deduplicación entre logros/equipos distintos.
- Se suman todas las variantes de cada imagen (principal y miniaturas), no solo la más grande.
- Unidades decimales: 1 MB = 1.000.000 bytes; 1 GB = 1.000 MB.

## 2. Supuestos de peso por imagen completa, incluidas variantes

Son valores hipotéticos para estimar sensibilidad, pendientes de sustituir por medidas de un lote real. Principales 256/512/1280 px y variantes 96/128/(320 y 640) px están acordados. Las dimensiones no garantizan estos pesos. PNG detallado puede superar incluso el escenario pesado. Los presupuestos siguientes ya incluyen variantes: no sumarles otra vez los porcentajes adicionales explicados a continuación. Se mantienen como escenarios hipotéticos, sin inferir ahorro medido por retirar el logo propuesto de 256 px.

| Tipo | Resolución principal + variantes acordadas | Escenario base | Escenario de archivos pesados |
| --- | --- | ---: | ---: |
| Avatar general o específico | 256 y 96 px | 0,10 MB | 0,30 MB |
| Logo | Lado mayor 512 y 128 px | 0,30 MB | 0,80 MB |
| Imagen de logro | Lado mayor 1280, 640 y 320 px | 1,00 MB | 3,00 MB |

El escenario pesado no representa un máximo garantizado. No se conservan originales. Entrada acordada: hasta 10 MB (10.000.000 bytes) y 24 MP (24.000.000 píxeles) por imagen, sujeta a prueba de consumo. Sin historial activo de versiones sustituidas, acordado el 2026-09-23. Limpieza acordada: intento tras éxito/fallo, revisión horaria de restos y retirada de abandonados tras 24 h. Peso de salida, mecanismo de limpieza y retención de backups siguen por concretar en D04/D06/D07, después de medir calidad, bytes y recursos.

### Espacio adicional de variantes frente a guardar solo la principal

**Aceptado el 2026-09-24:** el usuario considera aceptable el extra estimado. Aproximación por número de píxeles, suponiendo igual proporción y bytes por píxel comparables; no es una medición de PNG/JPEG ni un máximo garantizado.

| Tipo | Cálculo de píxeles adicionales / principal | Extra aproximado |
| --- | --- | ---: |
| Avatar | 96² / 256² | 14,06 % |
| Logo | 128² / 512² | 6,25 % |
| Logro | (320² + 640²) / 1280² | 31,25 % |

Los bytes reales dependen del contenido, la compresión y las dimensiones efectivas. No hay un porcentaje global único: depende de la mezcla de imágenes. No ampliar fuentes pequeñas ni guardar tamaños duplicados. Medir el conjunto completo con imágenes reales; los escenarios de este documento ya incluyen principal y variantes.

## 3. Fórmula reutilizable

Variables:

- U: usuarios con avatar general.
- A: relaciones persona + equipo con avatar específico conservado, tanto de miembros activos como de personas que salieron mientras el equipo siga existiendo. Cada imagen se cuenta una vez, también si la persona reingresa.
- T: equipos con logo.
- L: logros con imagen.

**Base, en MB = 0,10 × (U + A) + 0,30 × T + 1,00 × L.**

**Pesado, en MB = 0,30 × (U + A) + 0,80 × T + 3,00 × L.**

Para contar por usuario, su aportación base es 0,10 MB por foto general + 0,10 MB por cada avatar específico. Un usuario con foto general y dos avatares de equipo suma 0,30 MB; un usuario que hereda la general en todos sus equipos suma 0,10 MB.

Por cada 1.000 logros distintos con imagen, añadir 1 GB en el escenario base o 3 GB en el pesado. Conseguir esos mismos logros por más jugadores no multiplica esta cantidad.

## 4. Escenarios de crecimiento

Supuesto común: 20 personas por equipo, una membresía por persona, 50 logros por equipo; todos tienen foto general y específica, todos los equipos tienen logo y todos los logros tienen imagen. Por tanto, A = U. Cambiar la media de equipos por persona exige recalcular A; las fotos ausentes reducen el total.

**Retención acordada el 2026-09-23:** las tablas siguientes suponen que todavía no hay avatares adicionales de antiguos miembros. Salir del equipo no libera su avatar específico; sumar esos avatares conservados a A. Cada 1.000 adicionales añaden 0,10 GB en base o 0,30 GB en el escenario pesado, incluidas las variantes previstas. No es historial de versiones de una foto: se conserva únicamente la última imagen de cada relación persona + equipo.

| Usuarios | Equipos | Logros con imagen | Base optimizada | Archivos pesados | Base + 30 % de margen | Pesado + 30 % de margen |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 200 | 10 | 500 | 0,543 GB | 1,628 GB | 0,706 GB | 2,116 GB |
| 1.000 | 50 | 2.500 | 2,715 GB | 8,140 GB | 3,530 GB | 10,582 GB |
| 5.000 | 250 | 12.500 | 13,575 GB | 40,700 GB | 17,648 GB | 52,910 GB |

Ejemplo de un equipo de 20 personas y 50 logros: 40 avatares × 0,10 + 1 logo × 0,30 + 50 imágenes × 1,00 = **54,3 MB** en base. Incluye las fotos generales de esas personas; no volver a sumarlas al agregar otros equipos de las mismas personas.

El 30 % es una provisión orientativa para variación de tamaño y espacio de trabajo; no una medida del overhead de SeaweedFS ni una garantía ante cualquier volumen de subidas. No incluye crecimiento indefinido, históricos, copias de seguridad o réplicas adicionales.

## 5. Originales descartados: comparación de capacidad

**Alternativa descartada por el usuario: «sin originales».** Se conserva esta comparación hipotética para explicar la decisión: guardar además un original de **4 MB de media por imagen actual**. No es un límite de subida propuesto ni supone que toda foto real pese 4 MB. Se cuenta un original por imagen lógica, no por variante.

Extra de originales, en MB = 4 × (U + A + T + L).

| Usuarios / equipos / logros | Solo versiones optimizadas, base | Base + originales de 4 MB |
| --- | ---: | ---: |
| 200 / 10 / 500 | 0,543 GB | 4,183 GB |
| 1.000 / 50 / 2.500 | 2,715 GB | 20,915 GB |
| 5.000 / 250 / 12.500 | 13,575 GB | 104,575 GB |

Tabla sin margen ni backups. La columna con originales no forma parte del presupuesto elegido. **Desde el acuerdo del 2026-09-23 tampoco se conserva historial de imágenes procesadas sustituidas:** se eliminan la principal anterior y sus variantes tras completar el reemplazo y comprobar que ya no están referenciadas. Prever espacio transitorio de coexistencia y limpieza pendiente; las copias de seguridad mantienen su retención independiente, todavía por definir.

La principal procesada será la fuente para futuros recortes o variantes; recuperar detalle descartado requerirá volver a subir la fuente. El original solo será temporal y se retirará después de verificar procesamiento, guardado y asociación correcta de las versiones definitivas. Debe contemplarse espacio temporal para subidas simultáneas y limpieza tras fallo/abandono; plazos acordados en D06 (limpieza tras éxito/fallo, barrido horario, abandonados tras 24 h), mecanismo pendiente. Los restos acumulados por subidas abandonadas o fallidas pueden superar el espacio de los 12 trabajos admitidos; dimensionarlos según la tasa de subidas y vigilar fallos de limpieza. Los originales temporales quedan fuera de backups. Es una política acordada para implementar, no una limpieza ejecutada.

## 6. Disco del servidor, réplicas y copias

Por decisión del usuario del 2026-09-23, la estrategia de copias y la prueba de restauración se concretarán al preparar el despliegue. Los cálculos de backups siguientes quedan como referencia de capacidad, no como política aprobada ni requisito del piloto local.

Las tablas estiman bytes de imágenes activas con **una sola copia de datos**. No equivalen al disco exacto que habrá que aprovisionar para SeaweedFS.

Antes de fijar capacidad física, verificar configuración de volúmenes/reserva de SeaweedFS, metadatos, logs, fragmentación, limpieza y espacio temporal para procesar/reemplazar archivos. PostgreSQL, contenedores y sistema operativo quedan fuera de estos cálculos.

- Una copia de seguridad completa de las imágenes añade aproximadamente otro conjunto del mismo tamaño en su destino, sin suponer ahorro por compresión. Si el destino es externo no consume ese espacio adicional en el servidor principal, salvo staging local.
- Varias copias completas o historial retenido aumentan el total; una estrategia incremental necesita estimar la tasa de cambios. No multiplicar automáticamente por el número de días sin elegir estrategia.
- Si se habilitan réplicas, multiplicar la parte de datos replicada según configuración real. No confundir réplica con backup.
- Las copias deben incluir los datos necesarios para recuperar referencias y archivos coherentemente; los dumps de PostgreSQL existentes no contienen las imágenes.

Para el escenario de 1.000 usuarios/2.500 logros, la base elegida sin originales es 2,715 GB de imágenes activas; una copia completa externa añade aproximadamente 2,715 GB en el destino de backup, antes de márgenes y metadatos. El escenario pesado sin originales sigue siendo 8,140 GB activos y aproximadamente otro tanto para una copia completa.

## 7. Qué falta medir para fijar cuotas

1. Procesar un lote autorizado representativo: fotos JPG, ilustraciones PNG detalladas, logos transparentes y avatares, con las resoluciones acordadas.
2. Sumar principal y variantes por recurso; medir media, percentiles altos, máximo observado, tiempo y memoria de procesamiento. Concurrencia acordada: máximo de 2 imágenes en procesamiento, con todas sus variantes, y 10 esperando. Medir dos entradas máximas simultáneas; las 10 pendientes se conservan temporalmente sin descomprimir. Sus archivos de entrada sumarán como máximo 100 MB (10 × 10 MB), aparte de activos, transferencias y resultados temporales. Las entradas originales de los 12 trabajos admitidos suman como máximo 120 MB; no es el espacio total necesario ni una estimación de RAM. Este límite no cambia los bytes permanentes de las tablas ni acredita memoria suficiente.
3. Confirmar usuarios, membresías, equipos y logros previstos, espacio libre y presupuesto de recursos del servidor.
4. Con originales descartados, concretar limpieza temporal y de sustituidas, réplicas y backups, sin historial activo de procesadas; fijar límites y alertas con margen operativo.

No se han procesado imágenes ni inspeccionado recursos del servidor para esta estimación. Los cálculos aritméticos sí se han verificado. No se fija todavía capacidad de disco, cuota de usuario ni contratación de R2.
