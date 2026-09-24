import { z } from "zod"

// 📚 Validamos texto ISO con zona antes de convertirlo: coerce.date solo aceptaría
// 📚 también null/boolean/números y podría convertir un dato inválido en una fecha real.
const seasonDate = z.iso.datetime({ offset: true }).transform(value => new Date(value))

// 📚 refine compara instantes ya normalizados: el fin debe ser posterior al inicio,
// 📚 aunque el cliente haya enviado dos zonas horarias diferentes.
export const createSeasonSchema = z.object({
  name: z.string().trim().min(1).max(120),
  startsAt: seasonDate,
  endsAt: seasonDate,
}).strict().refine(data => data.endsAt > data.startsAt, {
  message: "La fecha de fin debe ser posterior a la fecha de inicio",
  path: ["endsAt"],
})
