import { z } from "zod"

export const achievementScopeSchema = z.enum(["PERMANENT", "SEASONAL"])

// 📚 Límites de texto y cantidad acotan el payload; trim impide criterios vacíos visualmente.
export const criteriosSchema = z.array(z.string().trim().min(1).max(300)).max(10)

// 📚 Esquema de validación para crear un logro. Se usa vía validate(crearLogroSchema) en la
//    ruta POST /logros. Valida FORMA, no solo presencia.
export const crearLogroSchema = z.object({
    nombre: z.string().trim().min(1).max(120),
    // 📚 number().int().nonnegative(): entero >= 0. .int() descarta decimales, .nonnegative()
    //    admite el 0 pero rechaza negativos (decisión de dominio: un logro puede valer 0 pts).
    puntos: z.number().int().nonnegative(),
    descripcion: z.string().trim().min(1).max(1000).optional(),
    categoria: z.string().trim().min(1).max(80).optional(),
    // 📚 Default vacío mantiene compatible la creación anterior con solo nombre y puntos.
    criterios: criteriosSchema.default([]),
    // 📚 El default conserva el contrato anterior: si el cliente no conoce temporadas,
    // 📚 el logro sigue comportándose como uno que solo se obtiene una vez.
    scope: achievementScopeSchema.default("PERMANENT"),
}).strict()
