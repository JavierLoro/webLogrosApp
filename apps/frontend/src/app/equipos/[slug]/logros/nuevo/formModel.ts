export type AchievementFormRole = "PLAYER" | "TEAM_ADMIN"

export type AchievementFormValues = {
  nombre: string
  descripcion: string
  puntos: string
  categoria: string
  criterios: string[]
}

export type AchievementFormErrors = Partial<Record<"nombre" | "descripcion" | "puntos" | "categoria" | "criterios", string>>

type ProposalBody = {
  nombre: string
  descripcion: string
  criterios: string[]
}

type AchievementBody = {
  nombre: string
  puntos: number
  descripcion?: string
  categoria?: string
  criterios: string[]
}

type PreparedSubmission =
  | { ok: false; errors: AchievementFormErrors }
  | { ok: true; endpoint: "propuestas"; redirect: "solicitudes"; body: ProposalBody }
  | { ok: true; endpoint: "logros"; redirect: "logros"; body: AchievementBody }

export function prepareAchievementSubmission(role: AchievementFormRole, values: AchievementFormValues): PreparedSubmission {
  const nombre = values.nombre.trim()
  const descripcion = values.descripcion.trim()
  const categoria = values.categoria.trim()
  const puntosText = values.puntos.trim()
  const criterios = values.criterios.map((criterion) => criterion.trim()).filter(Boolean)
  const errors: AchievementFormErrors = {}

  if (!nombre) errors.nombre = "Escribe un nombre para el logro."
  else if (nombre.length > 120) errors.nombre = "El nombre no puede superar 120 caracteres."

  if (role === "PLAYER" && !descripcion) errors.descripcion = "Describe la idea que quieres proponer."
  else if (descripcion.length > 1000) errors.descripcion = "La descripción no puede superar 1000 caracteres."

  if (values.criterios.length > 10) errors.criterios = "Puedes añadir como máximo 10 criterios."
  else if (values.criterios.some((criterion) => criterion.trim().length > 300)) errors.criterios = "Cada criterio puede tener como máximo 300 caracteres."
  else if (role === "PLAYER" && criterios.length === 0) errors.criterios = "Añade al menos un criterio para enviar la propuesta."

  if (role === "TEAM_ADMIN") {
    const puntos = Number(puntosText)
    if (!puntosText) errors.puntos = "Indica cuántos puntos vale el logro."
    else if (!Number.isInteger(puntos) || puntos < 0) errors.puntos = "Los puntos deben ser un entero mayor o igual que 0."
    if (categoria.length > 80) errors.categoria = "La categoría no puede superar 80 caracteres."
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  if (role === "PLAYER") {
    return {
      ok: true,
      endpoint: "propuestas",
      redirect: "solicitudes",
      body: { nombre, descripcion, criterios },
    }
  }

  const puntos = Number(puntosText)
  return {
    ok: true,
    endpoint: "logros",
    redirect: "logros",
    body: {
      nombre,
      puntos,
      ...(descripcion ? { descripcion } : {}),
      ...(categoria ? { categoria } : {}),
      criterios,
    },
  }
}
