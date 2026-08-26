/**
 * Contratos de dominio del frontend.
 *
 * Los campos que vienen del backend conservan sus nombres en español para que
 * el contrato sea trazable a Prisma/Express. Los campos de estado, ranking,
 * actividad y objetivos son de presentación y no pretenden afirmar que ya
 * existan en la API actual.
 */

export type ISODateString = string

export type AchievementStatus =
  | "available"
  | "in_progress"
  | "pending"
  | "earned"
  | "rejected"
  | "locked"

export type ObjectiveStatus = "not_started" | "in_progress" | "completed" | "blocked"

export type ActivityType =
  | "achievement_earned"
  | "achievement_created"
  | "achievement_requested"
  | "achievement_approved"
  | "achievement_rejected"

export type RankingTrend = "up" | "down" | "same" | "new"

/** Respuesta real del modelo Team expuesta por resolveTeam. */
export interface Team {
  id: number
  slug: string
  nombre: string
}

/**
 * Logro normalizado para la UI.
 *
 * `estado` no lo devuelve hoy el backend; el cliente lo normaliza a
 * `available` cuando falta y los fixtures pueden representar el resto de
 * estados mientras no exista el modelo de progreso en la API.
 */
export interface Achievement {
  id: number
  teamId: number
  nombre: string
  puntos: number
  descripcion: string | null
  categoria: string | null
  icono: string | null
  estado: AchievementStatus
  fechaObtencion: ISODateString | null
}

export interface Player {
  id: number
  nombre: string
  email: string | null
  puntos: number
  logros: number
  posicion: number
  tendencia: RankingTrend
  avatarUrl: string | null
}

export interface RankingEntry {
  posicion: number
  jugador: Player
  puntos: number
  logros: number
  tendencia: RankingTrend
}

export interface ActivityItem {
  id: string
  tipo: ActivityType
  mensaje: string
  fecha: ISODateString
  jugadorId: number | null
  logroId: number | null
}

export interface ObjectiveProgress {
  actual: number
  objetivo: number
}

export interface Objective {
  id: string
  titulo: string
  descripcion: string
  estado: ObjectiveStatus
  progreso: ObjectiveProgress
  fechaLimite: ISODateString | null
}

export interface DashboardTotals {
  jugadores: number
  logrosOtorgados: number
  puntosAcumulados: number
}

export interface DashboardHighlights {
  logroMasConseguido: Achievement | null
  logroMasRaro: Achievement | null
  ultimoCreado: Achievement | null
}

/** Snapshot de UI; los campos no disponibles en API se alimentan desde fixtures. */
export interface DashboardSnapshot {
  equipo: Team
  totales: DashboardTotals
  destacados: DashboardHighlights
  ranking: RankingEntry[]
  actividadReciente: ActivityItem[]
  objetivos: Objective[]
}
