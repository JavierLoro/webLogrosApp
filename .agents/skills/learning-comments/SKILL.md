---
name: learning-comments
description: >
  Adds pedagogical "why" comments when backend code is written, verified, or
  reviewed in this progressive-learning project. Use for Express, Prisma,
  authentication, validation, configuration and backend architecture, or when
  the user explicitly asks to annotate code. Do not trigger for ordinary
  frontend implementation or review: the frontend is now built autonomously
  and code-first, while existing learning comments are preserved.
---

# Learning Comments

El backend de este proyecto es un entorno de aprendizaje progresivo (ver
[progressive-tutor]). Sus comentarios permiten reconstruir el *porqué* de las
decisiones semanas después. El frontend se implementa de forma autónoma y no exige
añadir notas pedagógicas nuevas.

## Cuándo se activa

Siempre que **verifiques, edites, apruebes o revises código backend** en este repo, o
cuando el usuario solicite expresamente comentarios pedagógicos. No se activa por el
trabajo frontend ordinario. Los comentarios `// 📚` existentes se preservan.

## Qué comentar (dos niveles)

1. **El porqué del bloque** — encima de cada clase, función o módulo relevante, un
   comentario breve que explique *por qué existe* y *qué problema resuelve*, no lo que
   ya se ve en el código. Ejemplo malo: `// crea un usuario`. Ejemplo bueno:
   `// Fail-fast: valida la config al arrancar para que un despliegue mal configurado
   muera aquí con mensaje claro, en vez de reventar dentro de una petición.`

2. **Líneas de concepto aprendido** — inline en las líneas donde se aplicó un concepto
   que el usuario estaba aprendiendo. Anclar al concepto por su nombre para que sea
   buscable y conecte con `docs/apuntes.md`.

## Formato: prefijo `// 📚`

**Todo** comentario pedagógico lleva el prefijo `// 📚` (o `{/* 📚 ... */}` en JSX).
Esto los hace distintivos, greppables (`grep -rn "📚" src/`) y fáciles de eliminar en
un build de producción si se quisiera. Los comentarios normales de código NO llevan el
prefijo — el prefijo es exclusivo de las notas de aprendizaje.

```ts
// 📚 <por qué> / <concepto>
```

Ejemplos reales de este proyecto:

```ts
// 📚 extends Error: reutilizamos el error nativo (message, stack, lo detecta try/catch)
//    y solo le añadimos statusCode. No reinventamos qué es un error.
export class AppError extends Error {
  // 📚 parameter property: "public statusCode" declara + asigna el campo en un gesto.
  constructor(public statusCode: number, message: string) {
    super(message) // 📚 super(message) inicializa el Error padre → .message funciona gratis
  }
}
```

```ts
// 📚 process.exit(1) es tipo `never` → TS estrecha (narrowing) `value` a string tras el if,
//    por eso el return compila sin `!`.
return value
```

## Guía de qué conceptos comentar

Usa `docs/apuntes.md`, `docs/Roadmap.md` y `docs/Architecture.md` como índice de los
conceptos que el usuario ha aprendido. Si un archivo aplica un concepto que aparece
documentado ahí, ese punto merece un `// 📚`. Ejemplos por fase:

- **TS/OOP:** parameter properties, `extends`/`super`, `never`/narrowing, `unknown` vs `any`.
- **Express:** middleware, orden de montaje, firma de 4 args del error handler, CORS manual.
- **Auth:** hash bcrypt, firma/verificación JWT, `Authorization: Bearer`, inyección `req.userId`.
- **Prisma:** cliente singleton, adapter pg, migraciones vs `db push`, relaciones.
- **Config/infra:** fail-fast, orden de carga de dotenv, `process.exit` codes, rewrites, nginx.

## Reglas

- **No dupliques apuntes.md en el código.** El comentario es un *puntero* al concepto y su
  porqué local; la explicación larga vive en apuntes. Máximo 1–3 líneas por nota.
- **No comentes lo obvio.** `i++ // incrementa i` está prohibido. Comenta decisiones y conceptos.
- **Preserva los comentarios existentes.** Solo añades; no borras comentarios útiles previos.
- **Verifica después de comentar** que el código sigue compilando (`tsc --noEmit`) / linteando.
- **Idioma:** español, como el resto de docs del proyecto.
