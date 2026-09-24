import { z } from "zod"
import { registerSchema } from "./auth"

// 📚 Una lista cerrada de campos evita mass assignment: editar identidad no permite
// 📚 cambiar email, contraseña ni permisos. Reutilizar el registro mantiene sus límites.
export const profileSchema = registerSchema.pick({ firstName: true, lastName: true }).strict()

// 📚 null representa «sin alias». Normalizar también el texto vacío conserva una sola
// 📚 representación y deja que publicName aplique el nombre global como alternativa.
export const teamAliasSchema = z.object({
  displayName: z.string().trim().max(80).nullable().transform(value => value || null),
}).strict()
