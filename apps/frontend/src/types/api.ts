export interface Logro {
  id: number
  createdAt: string
  nombre: string
  puntos: number
  criterios: string[]
  descripcion?: string | null
  categoria?: string | null
  icono?: string | null
  teamId: number
}

export interface CatalogAchievement extends Logro {
  holdersCount: number
  earnedByMe: boolean
}

export interface ApiErrorBody {
  error?: string
  message?: string
}

export interface LoginResponse {
  teams: TeamMembershipSummary[]
  isSuperAdmin: boolean
}

export interface TeamMembershipSummary {
  slug: string
  nombre: string
  role: "TEAM_ADMIN" | "PLAYER"
}

export interface TeamSummary extends TeamMembershipSummary {
  stats: {
    achievements: number
    players: number
  }
}

export type TeamRole = TeamMembershipSummary["role"]

export interface TeamContext {
  team: {
    id: number
    slug: string
    nombre: string
  }
  me: {
    id: number
    displayName: string
    role: TeamRole
  }
}

export interface DashboardTotals {
  members: number
  catalog: number
  awards: number
  points: number
  uniqueEarned: number
  participants: number
}

export interface DashboardPlayer {
  id: number
  displayName: string
  role: TeamRole
  joinedAt: string
  puntos: number
  logrosCount: number
  position: number
  ultimoLogro: {
    id: number
    nombre: string
    fecha: string
  } | null
}

export interface DashboardAchievement extends Logro {
  createdAt: string
  holdersCount: number
}

export interface DashboardAward {
  id: number
  fecha: string
  user: {
    id: number
    displayName: string
  }
  logro: Logro & {
    createdAt: string
  }
}

export interface TeamDashboard {
  totals: DashboardTotals
  me: Pick<DashboardPlayer, "puntos" | "logrosCount" | "position">
  topPlayers: DashboardPlayer[]
  recentAchievements: DashboardAchievement[]
  recentAwards: DashboardAward[]
  mostEarned: DashboardAchievement | null
  rarestEarned: DashboardAchievement | null
}

export interface TeamRanking {
  players: DashboardPlayer[]
  totals: DashboardTotals
}

export interface PlatformTeam {
  id: number
  slug: string
  nombre: string
  _count: {
    miembros: number
    logros: number
  }
}

export interface TeamRequest {
  id: number
  userId: number
  teamName: string
  officialEmail: string
  message: string | null
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt: string
  reviewedAt: string | null
  user: {
    id: number
    email: string
  }
}

export interface RegisterResponse {
  id: number
  firstName: string
  lastName: string
  email: string
}

export interface AchievementRequest {
  id: number
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt: string
  reviewedAt: string | null
  logro: Logro
  user?: { id: number; email: string }
}

export interface TeamMember {
  id: number
  email: string
  role: "TEAM_ADMIN" | "PLAYER"
}
