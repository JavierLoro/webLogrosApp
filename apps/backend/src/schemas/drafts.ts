import { z } from "zod"

// 📚 Guardar permite incompletos; enviar reutiliza los esquemas completos existentes, sin relajar sus reglas.
export const draftFieldsSchema = z.object({
  nombre: z.string().max(120).optional(), descripcion: z.string().max(1000).optional(),
  criterios: z.array(z.string().max(300)).max(10).optional(),
  puntos: z.number().int().min(0).max(2147483647).optional(), categoria: z.string().max(80).optional(),
  scope: z.enum(["PERMANENT", "SEASONAL"]).optional(), kind: z.enum(["STANDARD", "PROGRESSIVE"]).optional(),
  targetValue: z.number().int().positive().max(2147483647).nullable().optional(), isSecret: z.boolean().optional(),
}).strict()
export const draftCreateSchema = z.object({ purpose: z.enum(["PROPOSAL", "DIRECT"]), fields: draftFieldsSchema.default({}) }).strict()
export const draftUpdateSchema = z.object({ version: z.number().int().positive(), fields: draftFieldsSchema }).strict()
export const draftVersionSchema = z.object({ version: z.number().int().positive() }).strict()
export const draftSubmissionSchema = z.object({ borradorId: z.string().uuid().transform(value => value.toLowerCase()), version: z.number().int().positive() }).strict()
