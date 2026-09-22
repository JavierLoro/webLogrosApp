import { z } from "zod"
import { achievementScopeSchema, criteriosSchema, achievementDefinitionFields, validAchievementTarget } from "./logros"

// 📚 strict rechaza campos que intentarían imponer autor, tenant, estado o concesión desde el cliente.
export const crearPropuestaSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  descripcion: z.string().trim().min(1).max(1000),
  criterios: criteriosSchema.min(1),
}).strict()

// 📚 El administrador decide los puntos de catálogo al aprobar; proponer nunca suma puntos.
export const aceptarPropuestaSchema = z.object({
  puntos: z.number().int().min(0).max(2147483647),
  categoria: z.string().trim().min(1).max(80).optional(),
  scope: achievementScopeSchema.default("PERMANENT"),
  ...achievementDefinitionFields,
}).strict().refine(validAchievementTarget, { path: ["targetValue"], message: "Solo los logros progresivos requieren un objetivo positivo" })
