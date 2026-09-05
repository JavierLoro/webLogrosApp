# Auditoría de textos del frontend

Fecha: 29 de agosto de 2026.

## Decisión de posicionamiento

**Idea central:** un equipo puede conservar en un catálogo común los hitos que suelen perderse en el chat o en la memoria.

**Acción principal:** crear una cuenta.

**Acción secundaria:** abrir una invitación para unirse a un equipo.

La redacción evita presentar como actuales el ranking, los perfiles, los logros desbloqueados y el progreso semanal. También distingue entre crear una cuenta y crear una sala, porque el registro actual solo hace lo primero.

## Alternativas evaluadas para el inicio

### A. Claridad desde el problema, elegida

- Título: “Que cada avance cuente.”
- CTA: “Crear mi cuenta.”
- Motivo: conserva carácter sin expulsar el CTA del primer pantallazo. La frase siguiente concreta el problema de los hitos que se pierden entre mensajes.

### B. Más emocional

- Título: “Vuestro equipo avanza. Que se note.”
- CTA: “Crear mi cuenta.”
- Riesgo: tiene más carácter, pero explica peor qué hace el producto a una visita fría.

### C. Más orientada a la identidad

- Título: “Decidid qué merece celebrarse.”
- CTA: “Empezar mi catálogo.”
- Riesgo: expresa bien la filosofía, pero el CTA prometería un catálogo antes de tener equipo e invitación.

## Resultado de los siete barridos

1. **Claridad:** se sustituyeron frases abstractas como “volver al juego” y “poner el progreso en movimiento” por el destino real de cada acción.
2. **Voz:** toda la experiencia usa español de España y conserva “sala”, “catálogo” y “logro” como vocabulario propio.
3. **Utilidad:** cada bloque explica qué puede hacer la persona al entrar, registrarse o usar una invitación.
4. **Prueba:** se eliminaron “listo en un minuto” y otras afirmaciones sin respaldo. Los números del inicio quedaron marcados como ejemplo.
5. **Especificidad:** se nombran cuenta, invitación, equipo, catálogo y puntos en lugar de “experiencia” o “progreso” sin contexto.
6. **Emoción:** el inicio utiliza la frustración de perder hitos en el chat sin exagerarla ni fabricar urgencia.
7. **Riesgo:** registro explica que hace falta una invitación; acceso anticipa que llevará a los equipos; los botones muestran estados de espera.

## Otras páginas revisadas

### Corregidas ahora

- **Mis equipos:** explica qué ocurre al abrir una sala y ofrece una salida clara en el estado vacío.
- **Unirse:** separa comprobar una invitación de unirse al equipo, pluraliza sus usos y explica el error de sesión.
- **Panel del equipo:** habla del catálogo disponible, no de actividad o progreso que el backend aún no calcula.
- **Catálogo:** elimina “conquistar” y muestra con precisión nombre, puntos y categoría.
- **Crear logro:** el título, la ayuda, el ejemplo y el CTA describen el objeto que se crea.
- **Solicitar acceso:** reconoce que la función no existe y dirige al flujo de invitación actual.

### Mantener en revisión antes de publicarlas

- **Ranking, jugadores, solicitudes y comunidad:** son placeholders con fases y jerga interna. Antes de habilitarlas necesitan texto de estado vacío, permisos, errores y una acción de recuperación, escrito contra el backend real de cada fase.
- **Administración de plataforma:** no debería quedar accesible como placeholder público. Su copy depende de los permisos y operaciones definitivos de `SUPER_ADMIN`.
- **Administración del equipo:** el texto funcional es correcto. Cuando se añada revocación, el CTA debe nombrar el objeto y la consecuencia, por ejemplo “Revocar invitación”.

## Próximas pruebas recomendadas

- Comparar el título elegido con “Vuestro equipo avanza. Que se note.” cuando haya tráfico suficiente.
- Medir clics separados en “Crear mi cuenta” y “Tengo una invitación”.
- Añadir prueba social solo cuando existan equipos reales, permiso para citarlos y una cifra verificable.
