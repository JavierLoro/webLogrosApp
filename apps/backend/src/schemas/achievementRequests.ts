import { z } from "zod"

// 📚 trim antes de min evita aceptar espacios como explicación de una decisión.
export const rejectAchievementRequestSchema = z.object({ reason: z.string().trim().min(1).max(500) })
// 📚 Conservar pendientes por defecto mantiene compatible el panel existente; all es explícito.
export const requestStatusSchema = z.enum(["PENDING", "ACCEPTED", "REJECTED", "all"]).default("PENDING")
