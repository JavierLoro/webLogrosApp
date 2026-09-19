# Lockerboard LB — especificación geométrica previa al SVG

Estado: **geometría aprobada y congelada**. Este documento, junto con `../symbol/lockerboard-symbol-master.svg`, es la fuente de verdad para los SVG de producción.

## 1. Fuente de verdad

Referencia visual: `codex-clipboard-af42621e-2a12-400d-aac1-41db1a7c68a5.png`.

La imagen mide `82 × 92 px`. La silueta útil ocupa aproximadamente:

- `x = 11…73 px`
- `y = 8…78 px`
- ancho visible: `63 px`
- alto visible: `71 px`
- relación ancho/alto: `0,887`

El master utiliza `viewBox="0 0 512 512"`: el lienzo es cuadrado y la silueta `LB` queda centrada dentro de él. La equivalencia de **6 unidades SVG por píxel de referencia** se usa únicamente para reconstruir la forma; los márgenes de la captura `82 × 92 px` no forman parte del logo.

La referencia se compara recortando primero su silueta, escalándola proporcionalmente y centrándola en un lienzo cuadrado. Nunca se fuerza el SVG cuadrado dentro del rectángulo original de la captura.

## 2. Caja y coordenadas maestras

| Elemento | Coordenadas SVG | Medida |
|---|---:|---:|
| Caja visible total | `x 67…445`, `y 43…469` | `378 × 426` |
| L — caja total | `x 67…313`, `y 43…355` | `246 × 312` |
| B — caja total | `x 175…445`, `y 133…469` | `270 × 336` |
| Eje geométrico vertical de la B | `y = 301` | — |
| Centro del brazo horizontal de la L | `y = 319` | `18 u` bajo el eje de la B |

Márgenes respecto al artboard cuadrado: `67 u` a izquierda y derecha; `43 u` arriba y abajo. La caja visible está centrada matemáticamente en ambos ejes.

## 3. Construcción de la L

La L es ortogonal y no lleva radios.

- Asta vertical: `x 67…145`, `y 43…355`.
- Grosor del asta: `78 u`.
- Brazo horizontal: `x 67…313`, `y 283…355`.
- Grosor del brazo: `72 u`.
- El brazo no se centra con la B: su centro está en `y = 319`, **por debajo** del eje `y = 301` de la B.
- El extremo derecho del brazo termina en `x = 313`.
- No hay chaflanes, inclinación ni redondeo en la L.

Path de construcción esperado:

```svg
M67 43H145V283H313V355H67Z
```

## 4. Construcción de la B

La B es una pieza continua situada detrás de la L.

- Caja exterior: `x 175…445`, `y 133…469`.
- Asta izquierda nominal: `78 u` (`x 175…253`).
- Los extremos **exteriores** derechos son curvos; quedan prohibidos los chaflanes en esas dos esquinas exteriores.
- Radio visual superior: aproximadamente `48 u`.
- Radio visual inferior: aproximadamente `72 u`.
- El lóbulo inferior es visualmente algo más lleno que el superior.
- La cintura interior es angular: dos tramos rectos convergen en un vértice. No es una transición cóncava suave.
- Los dos contraespacios se construyen con líneas rectas. Queda prohibido aplicarles radios, curvas de cápsula o esquinas redondeadas.
- Los contraespacios deben conservar una apertura mínima de `72 u` de ancho antes de aplicar el recorte de la L.

Puntos de control exteriores que no deben moverse:

- Arranque superior izquierdo: `(175, 133)`.
- Tangencia superior antes de la curva: aproximadamente `(355, 133)`.
- Extremo derecho: `x = 445`.
- Tangencia inferior: aproximadamente `(361, 469)`.
- Cierre inferior izquierdo: `(175, 469)`.

### 4.1 Geometría interior obligatoria

La ampliación de la referencia muestra tres decisiones angulares que deben mantenerse:

1. **Contraespacio superior:** rectángulo con salida inferior derecha a `45°`.
2. **Cintura:** entrada y salida mediante diagonales rectas que se encuentran en un vértice interior.
3. **Contraespacio inferior:** refleja verticalmente la lógica del superior; incorpora el chaflán de `45°` en su entrada superior derecha. Su parte superior izquierda queda parcialmente oculta por el brazo y el knockout de la L.

Polígonos de partida:

```svg
<!-- Contraespacio superior: 90°, 90°, 90° y chaflán de 45° -->
M253 199H367V247L337 277H253Z

<!-- Contraespacio inferior: reflejo vertical del superior -->
M253 325H337L367 355V403H253Z
```

Los dos huecos no son idénticos por traslación, sino **complementarios por reflexión vertical** alrededor de `y = 301`:

- Superior: tramo derecho vertical y chaflán descendente hacia la izquierda.
- Inferior: chaflán ascendente hacia la derecha y tramo derecho vertical.
- Longitud nominal de ambos chaflanes: `30 × 30 u`.

Puntos de la cintura angular:

- Llegada desde el lóbulo superior: aproximadamente `(433, 271)`.
- Vértice interior: aproximadamente `(403, 301)`.
- Salida hacia el lóbulo inferior: aproximadamente `(439, 337)`.
- Los segmentos de entrada y salida son rectos.
- Tolerancia inicial de estos tres puntos: `±6 u`, debido al antialias de la referencia raster.

Las Bézier o arcos se reservan exclusivamente para los dos remates exteriores derechos. No deben propagarse a los huecos ni a la cintura.

## 5. Entrelazado y gap

La relación no es una superposición directa ni un contorno oscuro pintado.

1. Se dibuja la B.
2. Se resta de la B una versión expandida de la L.
3. Se dibuja la L sobre el resultado.

Gap nominal: **24 u** (`4 px` en la referencia).

Corrección óptica junto al asta vertical: hasta **30 u** (`5 px`) para reproducir la referencia.

Contorno de recorte previsto:

```svg
M61 37H175V259H337V379H61Z
```

El gap debe ser transparente. Está prohibido simularlo con un trazo del color del fondo porque dejaría de funcionar sobre otros fondos.

## 6. Capas y color

Orden obligatorio:

1. `B` — `#E2E2E8` en la versión principal.
2. knockout transparente del gap.
3. `L` — `#FF5545`.

Las variantes monocromas conservan exactamente las mismas coordenadas y el mismo knockout. Solo cambia el relleno.

## 7. Comparación con la reconstrucción aprobada

La reconstrucción aprobada sustituye la construcción anterior y es la geometría que deben reutilizar los símbolos y lockups de producción.

- Relación visible actual aproximada: `0,77`; objetivo: `0,887`. La forma actual es demasiado estrecha.
- Grosor relativo actual del asta de la L: aproximadamente `30 %` del ancho total; objetivo: `20,6 %`.
- El tratamiento actual de la B no reproduce con suficiente fidelidad la silueta ni los radios de la referencia.
- La siguiente versión se construirá desde esta cuadrícula, no a partir de nuevas correcciones incrementales del path actual.

## 8. Criterios de aceptación

La reconstrucción no pasa a producción hasta cumplir todos:

1. `viewBox` exacto: `0 0 512 512`.
2. Caja visible dentro de una tolerancia de `±2 u` respecto a `67…445 × 43…469`.
3. Centro del brazo de la L en `y = 319 ± 2 u`.
4. Extremo derecho de la B en `x = 445 ± 2 u`.
5. Gap visible de `20…30 u`, transparente y sin contactos.
6. Dos remates **exteriores** derechos claramente redondeados y sin chaflanes.
7. Contraespacios sin radios y reflejados verticalmente: chaflán inferior derecho en el superior y chaflán superior derecho en el inferior.
8. Cintura angular formada por dos rectas y un vértice reconocible.
9. Tras recortar y centrar la silueta de referencia en un lienzo cuadrado equivalente, desviación máxima de `1 px` en rectas y `2 px` en curvas.
10. Lectura inequívoca como `LB` a `64 px` de alto.
11. A `32 px`, las dos piezas no se fusionan; si el gap colapsa, se creará después una variante óptica pequeña, sin alterar el master.
12. Símbolo aislado y lockups deben reutilizar el mismo path maestro, sin copias divergentes.

## 9. Estado de propagación

1. El candidato aprobado se conserva en `brand/specs/` como referencia técnica.
2. Las cuatro variantes del símbolo reutilizan la geometría aprobada.
3. Los cuatro lockups de producción reutilizan la misma geometría del símbolo.
4. Cualquier variante futura debe validarse contra esta especificación sin alterar el master.
