export interface Logro {
  id: number
  nombre: string
  puntos: number
  descripcion?: string | null
  categoria?: string | null
  icono?: string | null
  teamId: number
}

export interface ApiErrorBody {
  error?: string
  message?: string
}

export interface LoginResponse {
  token: string
  teams: TeamSummary[]
  isSuperAdmin: boolean
}

export interface TeamSummary {
  slug: string
  nombre: string
  role: "TEAM_ADMIN" | "PLAYER"
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
  email: string
}
