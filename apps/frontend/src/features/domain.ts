import type {
  Achievement as SharedAchievement,
  AchievementStatus as SharedAchievementStatus,
  Objective as SharedObjective,
  RankingEntry as SharedRankingEntry,
  Team as SharedTeam,
} from "@/types"

export type AchievementRecord = SharedAchievement
export type RankingRecord = SharedRankingEntry
export type TeamRecord = SharedTeam
export type GoalRecord = SharedObjective

export type AchievementStatus = SharedAchievementStatus
// "secret" es una presentación del catálogo, no un estado persistido del contrato API.
export type AchievementDisplayStatus = AchievementStatus | "secret"

export interface ProgressSnapshot {
  current: number
  target: number
  label?: string | null
}

export interface DashboardTeamView {
  name: string
  slug?: string | null
  mark?: string | null
}

export interface AchievementView {
  id: string
  name: string
  description?: string | null
  category?: string | null
  points?: number | null
  icon?: string | null
  imageUrl?: string | null
  status: AchievementStatus
  displayStatus?: AchievementDisplayStatus
  progress?: ProgressSnapshot | null
}

export interface RankingView {
  id: string
  name: string
  score: number
  achievementCount?: number | null
  avatarUrl?: string | null
  initials?: string | null
}

function property(value: object, key: string): unknown {
  return Reflect.get(value, key)
}

function firstString(record: object, keys: string[]): string | null {
  for (const key of keys) {
    const value = property(record, key)
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

// 📚 Los IDs de Prisma llegan como número, mientras que los href y las keys de React
// necesitan una representación estable; se normalizan aquí para que los componentes no
// tengan que conocer el origen del dato.
function firstIdentifier(record: object, keys: string[]): string | null {
  for (const key of keys) {
    const value = property(record, key)
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return null
}

function firstNumber(record: object, keys: string[]): number | null {
  for (const key of keys) {
    const value = property(record, key)
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return null
}

function statusOf(value: unknown): { status: AchievementStatus; displayStatus?: AchievementDisplayStatus } {
  if (value === "available" || value === "pending" || value === "earned" || value === "rejected" || value === "locked") return { status: value }
  if (value === "in_progress" || value === "in-progress") return { status: "in_progress" }
  if (value === "secret" || value === "secreto") return { status: "locked", displayStatus: "secret" }
  return { status: "available" }
}

export function normalizeAchievement(input: AchievementRecord | AchievementView): AchievementView {
  const record = input
  const name = firstString(record, ["name", "nombre", "title", "titulo"]) ?? "Logro sin nombre"
  const id = firstIdentifier(record, ["id", "slug"]) ?? "achievement"
  const progressValue = property(record, "progress")
  const progressRecord = typeof progressValue === "object" && progressValue !== null ? progressValue : null
  const current = progressRecord ? firstNumber(progressRecord, ["current", "actual", "value"]) : null
  const target = progressRecord ? firstNumber(progressRecord, ["target", "objetivo", "total"]) : null
  const progress = current !== null && target !== null ? { current, target, label: progressRecord ? firstString(progressRecord, ["label", "etiqueta"]) : null } : null

  const state = statusOf(property(record, "status") ?? property(record, "estado"))
  return {
    id,
    name,
    description: firstString(record, ["description", "descripcion"]),
    category: firstString(record, ["category", "categoria"]),
    points: firstNumber(record, ["points", "puntos"]),
    icon: firstString(record, ["icon", "icono", "emoji"]),
    imageUrl: firstString(record, ["imageUrl", "image", "imagen", "image_url"]),
    status: state.status,
    displayStatus: state.displayStatus,
    progress,
  }
}

export function normalizeRanking(input: RankingRecord | RankingView): RankingView {
  const record = input
  const playerValue = property(record, "jugador")
  const player = typeof playerValue === "object" && playerValue !== null ? playerValue : record
  const name = firstString(player, ["name", "nombre", "displayName"]) ?? "Jugador sin nombre"
  const score = firstNumber(record, ["score", "points", "puntos", "totalPoints"]) ?? 0
  const id = firstIdentifier(player, ["id", "userId", "slug"]) ?? name.toLowerCase().replace(/\s+/g, "-")
  const initials = firstString(player, ["initials", "iniciales"]) ?? name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()

  return {
    id,
    name,
    score,
    achievementCount: firstNumber(record, ["achievementCount", "logros", "logrosGanados"]),
    avatarUrl: firstString(player, ["avatarUrl", "avatar", "foto"]),
    initials,
  }
}

export function normalizeTeam(input: TeamRecord | DashboardTeamView): DashboardTeamView {
  const record = input
  return {
    name: firstString(record, ["name", "nombre"]) ?? "Equipo",
    slug: firstString(record, ["slug", "teamSlug"]),
    mark: firstString(record, ["mark", "logo", "icon", "icono"]) ?? "✦",
  }
}

export function progressPercent(progress: ProgressSnapshot | null | undefined): number {
  if (!progress || progress.target <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((progress.current / progress.target) * 100)))
}

export function statusLabel(status: AchievementStatus): string {
  if (status === "earned") return "Conseguido"
  if (status === "in_progress") return "En progreso"
  if (status === "pending") return "Pendiente"
  if (status === "rejected") return "Rechazado"
  if (status === "locked") return "Bloqueado"
  return "Disponible"
}

export function statusLabelVisual(status: AchievementDisplayStatus): string {
  return status === "secret" ? "Secreto" : statusLabel(status)
}

export function statusSymbol(status: AchievementDisplayStatus): string {
  if (status === "earned") return "✓"
  if (status === "in_progress") return "↗"
  if (status === "secret") return "?"
  return "—"
}
