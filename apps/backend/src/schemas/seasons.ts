import { z } from "zod"

// 📚 coerce.date transforma el ISO recibido por JSON en Date antes de llegar a Prisma;
// 📚 refine expresa la regla de negocio que un periodo debe terminar después de empezar.
export const createSeasonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
}).strict().refine(data => data.endsAt > data.startsAt, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["endsAt"],
})
