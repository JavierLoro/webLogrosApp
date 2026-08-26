import type {
  Achievement,
  ActivityItem,
  DashboardSnapshot,
  Objective,
  Player,
  RankingEntry,
  Team,
} from "../../types/domain"

/**
 * FIXTURE RETIRABLE.
 *
 * El backend actual no expone jugadores, ranking, actividad, objetivos ni
 * estados de progreso. Este conjunto permite construir la UI de Culipardisk
 * sin inventar respuestas HTTP: elimínese cuando existan esos endpoints.
 */

export const culipardiskTeam: Team = {
  id: 1,
  slug: "culipardisk",
  nombre: "Culipardisk",
}

export const culipardiskAchievements: Achievement[] = [
  {
    id: 101,
    teamId: culipardiskTeam.id,
    nombre: "Primer salto",
    puntos: 100,
    descripcion: "Completar el primer objetivo del equipo.",
    categoria: "Inicio",
    icono: "🚀",
    estado: "earned",
    fechaObtencion: "2026-08-21T10:00:00.000Z",
  },
  {
    id: 102,
    teamId: culipardiskTeam.id,
    nombre: "Racha de equipo",
    puntos: 250,
    descripcion: "Conseguir logros durante cinco días consecutivos.",
    categoria: "Constancia",
    icono: "🔥",
    estado: "in_progress",
    fechaObtencion: null,
  },
  {
    id: 103,
    teamId: culipardiskTeam.id,
    nombre: "Juego limpio",
    puntos: 150,
    descripcion: "Recibir una valoración positiva de todo el equipo.",
    categoria: "Valores",
    icono: "🤝",
    estado: "pending",
    fechaObtencion: null,
  },
  {
    id: 104,
    teamId: culipardiskTeam.id,
    nombre: "Leyenda local",
    puntos: 500,
    descripcion: "Alcanzar el primer puesto del ranking mensual.",
    categoria: "Élite",
    icono: "🏆",
    estado: "locked",
    fechaObtencion: null,
  },
]

export const culipardiskPlayers: Player[] = [
  {
    id: 201,
    nombre: "Marina Soler",
    email: "marina@example.com",
    puntos: 1250,
    logros: 18,
    posicion: 1,
    tendencia: "up",
    avatarUrl: null,
  },
  {
    id: 202,
    nombre: "Álex Ferrer",
    email: "alex@example.com",
    puntos: 1090,
    logros: 15,
    posicion: 2,
    tendencia: "same",
    avatarUrl: null,
  },
  {
    id: 203,
    nombre: "Nora Vidal",
    email: "nora@example.com",
    puntos: 980,
    logros: 14,
    posicion: 3,
    tendencia: "up",
    avatarUrl: null,
  },
  {
    id: 204,
    nombre: "Dani Roca",
    email: "dani@example.com",
    puntos: 760,
    logros: 11,
    posicion: 4,
    tendencia: "down",
    avatarUrl: null,
  },
]

export const culipardiskRanking: RankingEntry[] = culipardiskPlayers.map((jugador) => ({
  posicion: jugador.posicion,
  jugador,
  puntos: jugador.puntos,
  logros: jugador.logros,
  tendencia: jugador.tendencia,
}))

export const culipardiskActivity: ActivityItem[] = [
  {
    id: "activity-1",
    tipo: "achievement_earned",
    mensaje: "Marina Soler ha conseguido Primer salto",
    fecha: "2026-08-25T16:30:00.000Z",
    jugadorId: 201,
    logroId: 101,
  },
  {
    id: "activity-2",
    tipo: "achievement_created",
    mensaje: "Se ha creado el logro Juego limpio",
    fecha: "2026-08-24T11:15:00.000Z",
    jugadorId: null,
    logroId: 103,
  },
  {
    id: "activity-3",
    tipo: "achievement_requested",
    mensaje: "Nora Vidal ha solicitado Racha de equipo",
    fecha: "2026-08-23T09:45:00.000Z",
    jugadorId: 203,
    logroId: 102,
  },
]

export const culipardiskObjectives: Objective[] = [
  {
    id: "objective-1",
    titulo: "Activar a todo el equipo",
    descripcion: "Conseguir que 20 jugadores completen un logro.",
    estado: "in_progress",
    progreso: { actual: 14, objetivo: 20 },
    fechaLimite: "2026-09-15T23:59:59.000Z",
  },
  {
    id: "objective-2",
    titulo: "Construir una racha",
    descripcion: "Mantener actividad durante cinco días seguidos.",
    estado: "completed",
    progreso: { actual: 5, objetivo: 5 },
    fechaLimite: null,
  },
  {
    id: "objective-3",
    titulo: "Juego limpio para todos",
    descripcion: "Validar las solicitudes pendientes del equipo.",
    estado: "not_started",
    progreso: { actual: 0, objetivo: 10 },
    fechaLimite: "2026-09-30T23:59:59.000Z",
  },
]

export const culipardiskDashboard: DashboardSnapshot = {
  equipo: culipardiskTeam,
  totales: {
    jugadores: culipardiskPlayers.length,
    logrosOtorgados: 58,
    puntosAcumulados: 4080,
  },
  destacados: {
    logroMasConseguido: culipardiskAchievements[0],
    logroMasRaro: culipardiskAchievements[3],
    ultimoCreado: culipardiskAchievements[2],
  },
  ranking: culipardiskRanking,
  actividadReciente: culipardiskActivity,
  objetivos: culipardiskObjectives,
}
