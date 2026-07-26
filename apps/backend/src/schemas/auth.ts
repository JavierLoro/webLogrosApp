import { z } from "zod"

// 📚 ESQUEMA DE VALIDACIÓN (Zod). Contrato único, ejecutable en runtime, de cómo es una
//    entrada de registro válida. Sustituye a los `if (!email...)` manuales: valida FORMA
//    (tipo + formato + longitud), no solo presencia. z.object descarta claves extra por
//    defecto (mata el mass assignment). Al fallar, .parse() lanza un ZodError.
export const registerSchema = z.object({
    // 📚 z.email() (v4): string con formato de email (atrapa 12345 y "noesunemail"). En Zod 4
    //    los formatos son top-level; el antiguo z.string().email() está deprecado.
    email: z.email(),
    // 📚 .min(6): al menos 6 caracteres (atrapa contraseñas triviales de 1 carácter).
    password: z.string().min(6),
})


// 📚 Esquema de LOGIN: más laxo que el de registro a propósito. Solo exige email con formato
//    y password no vacío — NO .min(6): un usuario ya registrado puede tener cualquier
//    contraseña; aquí solo comprobamos que llega algo, no imponemos reglas de creación.
export const loginSchema = z.object({
    email: z.email(),
    password: z.string().nonempty(),
})