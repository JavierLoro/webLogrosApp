---
name: learning-comments
description: >
  Adds pedagogical "why" comments to code whenever it is written, verified, or
  reviewed in this progressive-learning project. Use this skill EVERY TIME you
  check, verify, edit, or approve code (backend or frontend): after confirming
  the code works, annotate it with learning-oriented comments that explain the
  reason for a class/function/implementation decision and flag the concrete
  lines where a concept the user is learning was applied (e.g. super() calls,
  never/narrowing, instanceof narrowing, relative /api URLs, JWT signing,
  parameter properties, fail-fast, dotenv load order). Complements
  progressive-tutor: that skill teaches BEFORE writing; this one annotates
  AFTER verifying so the codebase itself becomes study material. Triggers on any
  code verification/review in this repo, and on explicit requests to "comment",
  "annotate", "explain in the code", or "add learning notes".
---

# Learning Comments

Este proyecto es un entorno de aprendizaje progresivo (ver [progressive-tutor]).
El código no es solo código: es **material de estudio**. Tu trabajo, cada vez que
compruebas o revisas código, es dejarlo comentado para que el usuario pueda releerlo
semanas después y reconstruir el *porqué*.

## Cuándo se activa

Siempre que **verifiques, edites, apruebes o revises** código en este repo. No es un
paso opcional: forma parte de "comprobar código". Si acabas de confirmar que algo
compila/funciona, el siguiente gesto es anotarlo.

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

```tsx
// 📚 ruta RELATIVA: el fetch corre en el navegador del visitante; /api lo resuelve nginx
//    (prod) o rewrites() (dev). Nunca http://localhost:3001 desde un Client Component.
const res = await fetch("/api/auth/login", { ... })
```

## Guía de qué conceptos comentar

Usa `docs/apuntes.md`, `docs/Roadmap.md` y `docs/Architecture.md` como índice de los
conceptos que el usuario ha aprendido. Si un archivo aplica un concepto que aparece
documentado ahí, ese punto merece un `// 📚`. Ejemplos por fase:

- **TS/OOP:** parameter properties, `extends`/`super`, `never`/narrowing, `unknown` vs `any`.
- **Express:** middleware, orden de montaje, firma de 4 args del error handler, CORS manual.
- **Auth:** hash bcrypt, firma/verificación JWT, `Authorization: Bearer`, inyección `req.userId`.
- **Prisma:** cliente singleton, adapter pg, migraciones vs `db push`, relaciones.
- **Next.js:** Server vs Client Components, `"use client"`, `localStorage`, `useRouter`,
  `usePathname`, `useEffect`, rutas relativas `/api` vs `BACKEND_URL`.
- **Config/infra:** fail-fast, orden de carga de dotenv, `process.exit` codes, rewrites, nginx.

## Reglas

- **No dupliques apuntes.md en el código.** El comentario es un *puntero* al concepto y su
  porqué local; la explicación larga vive en apuntes. Máximo 1–3 líneas por nota.
- **No comentes lo obvio.** `i++ // incrementa i` está prohibido. Comenta decisiones y conceptos.
- **Preserva los comentarios existentes.** Solo añades; no borras comentarios útiles previos.
- **Verifica después de comentar** que el código sigue compilando (`tsc --noEmit`) / linteando.
- **Idioma:** español, como el resto de docs del proyecto.
