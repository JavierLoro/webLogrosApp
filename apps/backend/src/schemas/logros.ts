import { z } from "zod"

// 📚 Esquema de validación para crear un logro. Se usa vía validate(crearLogroSchema) en la
//    ruta POST /logros. Valida FORMA, no solo presencia.
export const crearLogroSchema = z.object({
    // 📚 nonempty(): string de al menos 1 carácter (rechaza nombre "").
    nombre: z.string().nonempty(),
    // 📚 number().int().nonnegative(): entero >= 0. .int() descarta decimales, .nonnegative()
    //    admite el 0 pero rechaza negativos (decisión de dominio: un logro puede valer 0 pts).
    puntos: z.number().int().nonnegative(),
})
