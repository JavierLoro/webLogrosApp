# Adaptación visual — #30 y #29

## Referencias y alcance

Se conserva el sistema visual de las referencias canónicas del manifest. Se ha inspeccionado
`_compartidas/detalle-y-formulario-logro-desktop-v1.png`: detalle con identidad del logro a la
izquierda, descripción/criterios/estado a la derecha; formulario con campos principales y
metadatos, jerarquía tipográfica condensada, superficies oscuras, acento rojo y estado verde.
La propia referencia incluye el control de secreto. Los nuevos controles de tipo/objetivo y
avance son extensiones funcionales de ese lenguaje, no un rediseño del shell.

Se omiten fotografía, avatares, rareza, recomendaciones y elementos sin contrato aprobado. El
objetivo de este bloque es mostrar datos reales y acciones funcionales, conservando composición,
legibilidad y responsive. No cierra por extensión las tareas visuales pendientes de G6–G9.

## Estados que revisar

- Secreto bloqueado: representación neutral sin nombres, criterios, categorías, puntos u objetivo.
- Progresivo visible: sin iniciar, contador parcial, objetivo alcanzado pendiente de concesión y conseguido.
- Estacional sin temporada activa: explicación y controles de avance/concesión deshabilitados.
- Administrador: configuración de secreto, selección de miembro y registro/corrección del avance.
- Formulario: tipo, objetivo condicional, alcance y secreto solo en creación administrativa.
- Dashboard: denominador visible y conteos reales; solicitudes pendientes no contadas como avance.

## Revisión directa del Coordinator — PASS para este bloque funcional

Evidencia final: `qa/screenshots/` y `qa/browser-results.json`, recaptura
`qa30-1790085148618`. Se revisaron catálogo desktop, detalle parcial desktop/móvil, secreto móvil,
dashboard, creación desktop/móvil y controles administrativos. La matriz de QA cubre 24 vistas
en 1440×1024 y 390×844; dos capturas adicionales documentan el recorrido de concesión/revelado.

Hallazgos resueltos:

- Contador en límite entero: representación flexible de numerador/separador/denominador; QA
  confirma ausencia de overflow interno y de números fuera de los límites, además del global.
- Captura de secreto móvil inicialmente tomada durante carga: sustituida por el estado real,
  esperando el encabezado específico de cada ruta. Se ve «Logro secreto» sin definición ni avance.
- Los ajustes que exceden cero/objetivo se limitan en backend; controles y texto explican esa
  regla sin introducir una restricción distinta en frontend.

La adaptación conserva shell, tokens, contraste y jerarquía del catálogo/formulario. Los controles
son legibles y se apilan en móvil; la concesión prematura y las escrituras tras conceder quedan
deshabilitadas y explicadas. La barra nativa conserva su color de sistema (P2 aceptado).

Cero P0/P1 abiertos en el alcance añadido. El detalle mantiene su composición V1 existente: este
gate valida integración funcional y responsive, no certifica una réplica completa de la lámina
ni cierra los gates de rediseño pendientes. Media real excluida y placeholders conservados.
