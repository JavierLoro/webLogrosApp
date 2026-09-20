import "dotenv/config"
import bcrypt from "bcryptjs"
import prisma from "../src/lib/prisma"
import { encryptInvitationToken, hashInvitationToken } from "../src/lib/invitationToken"

type LogroSeed = {
  nombre: string
  puntos: number
  descripcion: string
  categoria: string
  icono: string
}

type TeamSeed = {
  slug: string
  nombre: string
  logros: LogroSeed[]
}

const teams: TeamSeed[] = [
  {
    slug: "halcones",
    nombre: "Halcones",
    logros: [
      { nombre: "Primer vuelo", puntos: 100, descripcion: "Completar el primer objetivo del equipo.", categoria: "Inicio", icono: "🪽" },
      { nombre: "Caza nocturna", puntos: 50, descripcion: "Resolver un reto fuera del horario habitual.", categoria: "Constancia", icono: "🌙" },
      { nombre: "Vuelo en picado", puntos: 200, descripcion: "Cerrar una tarea crítica antes del plazo.", categoria: "Impacto", icono: "⚡" },
      { nombre: "Trabajo en equipo", puntos: 80, descripcion: "Ayudar a otra persona a completar un objetivo.", categoria: "Equipo", icono: "🤝" },
      { nombre: "Mentoría", puntos: 120, descripcion: "Compartir conocimiento que desbloquee al equipo.", categoria: "Comunidad", icono: "🧭" },
      { nombre: "Racha impecable", puntos: 150, descripcion: "Completar cinco objetivos consecutivos.", categoria: "Constancia", icono: "🔥" },
      { nombre: "Pase decisivo", puntos: 90, descripcion: "Facilitar una acción que permita cerrar el objetivo común.", categoria: "Equipo", icono: "🎯" },
      { nombre: "Lectura del juego", puntos: 130, descripcion: "Anticipar una dificultad y compartir una solución con el equipo.", categoria: "Impacto", icono: "🧠" },
      { nombre: "Bienvenida al nido", puntos: 40, descripcion: "Acompañar a una nueva incorporación durante su primer encuentro.", categoria: "Inicio", icono: "👋" },
      { nombre: "Voz del equipo", puntos: 70, descripcion: "Recoger y compartir las ideas de todos en una reunión.", categoria: "Comunidad", icono: "📣" },
      { nombre: "Aprender y volver a intentarlo", puntos: 110, descripcion: "Aplicar una corrección acordada tras revisar una dificultad juntos.", categoria: "Constancia", icono: "🔁" },
      { nombre: "Una victoria compartida", puntos: 160, descripcion: "Completar una tarea exigente con ayuda de varias personas del equipo.", categoria: "Equipo", icono: "🏆" },
    ],
  },
  {
    slug: "lobos",
    nombre: "Lobos",
    logros: [
      { nombre: "Aullido lunar", puntos: 75, descripcion: "Celebrar públicamente una victoria del equipo.", categoria: "Equipo", icono: "🐺" },
      { nombre: "Guardia nocturna", puntos: 60, descripcion: "Resolver una incidencia urgente fuera de horario.", categoria: "Constancia", icono: "🌘" },
      { nombre: "Manada unida", puntos: 110, descripcion: "Completar un objetivo con colaboración de todo el equipo.", categoria: "Equipo", icono: "🐾" },
      { nombre: "Rescate crítico", puntos: 180, descripcion: "Recuperar una situación que bloqueaba al equipo.", categoria: "Impacto", icono: "🛟" },
      { nombre: "Estratega", puntos: 140, descripcion: "Proponer un plan que simplifique el siguiente reto.", categoria: "Comunidad", icono: "🗺️" },
    ],
  },
]

const users = [
  // 📚 isSuperAdmin modela un permiso global independiente de TeamRole: esta cuenta puede
  //    administrar la plataforma y, a la vez, ser TEAM_ADMIN dentro de Halcones.
  { email: "test@halcones.com", displayName: "Javier Loro", teamSlug: "halcones", isSuperAdmin: true, role: "TEAM_ADMIN" as const },
  { email: "diego@halcones.test", displayName: "Diego Ruiz", teamSlug: "halcones", isSuperAdmin: false, role: "TEAM_ADMIN" as const },
  ...[
    ["ana", "Ana Fernández"], ["marcos", "Marcos del Río"], ["laura", "Laura Sánchez"],
    ["pablo", "Pablo García"], ["maria", "María Pérez"], ["carmen", "Carmen Martín"],
    ["carlos", "Carlos Torres"], ["alex", "Álex Moreno de la Fuente"],
    ["daniel", "Daniel Molina"], ["elena", "Elena Castro"],
  ].map(([name, displayName]) => ({ email: `${name}@halcones.test`, displayName, teamSlug: "halcones", isSuperAdmin: false, role: "PLAYER" as const })),
  { email: "lucia@lobos.test", displayName: "Lucía Fernández", teamSlug: "lobos", isSuperAdmin: false, role: "PLAYER" as const },
]

// 📚 Índices de un catálogo fijo, no aleatoriedad: 40 relaciones con dos miembros a cero.
// 📚 María y Carmen comparten puntos para ejercitar un desempate estable del ranking.
const earned: Array<[string, number[]]> = [
  ["test@halcones.com", [0, 3]], ["diego@halcones.test", [0]],
  ["ana@halcones.test", [0, 1, 2, 3, 4, 5, 6]],
  ["marcos@halcones.test", [0, 1, 2, 3, 4, 5]],
  ["laura@halcones.test", [0, 1, 2, 3, 4]], ["pablo@halcones.test", [0, 1, 2, 3, 6]],
  ["maria@halcones.test", [0, 1, 2, 3]], ["carmen@halcones.test", [0, 1, 2, 3]],
  ["carlos@halcones.test", [0, 1, 2]], ["alex@halcones.test", [0, 1, 3]],
]
const assignments = [
  ...earned.flatMap(([email, indices]) => indices.map((index) => ({ email, teamSlug: "halcones", logro: teams[0].logros[index].nombre }))),
  { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Aullido lunar" },
  { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Manada unida" },
]

// 📚 Fechas UTC absolutas: ni el día de ejecución ni la zona horaria alteran las capturas.
const fixtureDate = (day: number, hour = 9) => new Date(`2026-09-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00:00.000Z`)
const requests = [
  { email: "ana@halcones.test", index: 6, status: "ACCEPTED" as const },
  { email: "marcos@halcones.test", index: 5, status: "ACCEPTED" as const },
  { email: "ana@halcones.test", index: 10, status: "REJECTED" as const },
  { email: "pablo@halcones.test", index: 10, status: "REJECTED" as const },
  { email: "ana@halcones.test", index: 11, status: "PENDING" as const },
  { email: "laura@halcones.test", index: 11, status: "PENDING" as const },
  { email: "daniel@halcones.test", index: 0, status: "PENDING" as const },
  { email: "elena@halcones.test", index: 0, status: "PENDING" as const },
]
const invitations = [
  { key: "active-one", maxUses: 10, uses: 0, expiresAt: fixtureDate(27), revokedAt: null },
  { key: "active-two", maxUses: 10, uses: 3, expiresAt: fixtureDate(28), revokedAt: null },
  { key: "active-three", maxUses: 20, uses: 8, expiresAt: fixtureDate(29), revokedAt: null },
  { key: "exhausted", maxUses: 10, uses: 10, expiresAt: fixtureDate(27), revokedAt: null },
  { key: "expired", maxUses: 10, uses: 4, expiresAt: fixtureDate(15), revokedAt: null },
  { key: "revoked", maxUses: 10, uses: 1, expiresAt: fixtureDate(27), revokedAt: fixtureDate(18) },
]

// 📚 Dos de estas ideas ya pertenecen al catálogo, pero ninguna concede puntos a su autor.
const proposals = [
  { email: "ana@halcones.test", nombre: "Organización compartida", descripcion: "Reconoce a quien organiza un encuentro y coordina al equipo.", criterios: ["Acordar fecha y lugar con el equipo.", "Comunicar la planificación a todos los miembros."], status: "ACCEPTED" as const, puntos: 100, categoria: "Equipo" },
  { email: "marcos@halcones.test", nombre: "Guía para el siguiente vuelo", descripcion: "Compartir una guía práctica que ayude a nuevas incorporaciones.", criterios: ["Redactar una guía con los acuerdos del equipo.", "Revisarla con otra persona antes de compartirla."], status: "ACCEPTED" as const, puntos: 120, categoria: "Comunidad" },
  { email: "ana@halcones.test", nombre: "Encuentro de aprendizaje", descripcion: "Preparar una sesión breve para compartir una técnica útil.", criterios: ["Preparar un ejemplo práctico.", "Compartir la sesión con el equipo."], status: "PENDING" as const },
  { email: "laura@halcones.test", nombre: "Cuidar el material", descripcion: "Organizar el material común para el próximo encuentro.", criterios: ["Revisar el inventario compartido.", "Dejar el material preparado para el equipo."], status: "PENDING" as const },
  { email: "ana@halcones.test", nombre: "Siempre disponibles", descripcion: "Reconocer la disponibilidad de los miembros para ayudar.", criterios: ["Responder siempre a cualquier petición del equipo."], status: "REJECTED" as const },
  { email: "pablo@halcones.test", nombre: "Victoria individual", descripcion: "Reconocer un resultado personal durante el encuentro.", criterios: ["Conseguir el mejor resultado individual."], status: "REJECTED" as const },
]

// 📚 Fail-fast: el seed necesita una contraseña elegida por quien lo ejecuta. Exigirla evita
//    guardar credenciales de prueba en Git o imprimirlas accidentalmente en los logs.
function requireSeedPassword(): string {
  const password = process.env.SEED_USER_PASSWORD
  if (!password || password.length < 6) {
    console.error("SEED_USER_PASSWORD debe estar definida y tener al menos 6 caracteres.")
    process.exit(1)
  }
  return password
}

async function main() {
  // 📚 Estos códigos son públicos y predecibles por diseño: el fixture solo puede sembrarse localmente.
  if (process.env.NODE_ENV === "production") throw new Error("El fixture visual no se ejecuta en producción")
  const passwordHash = await bcrypt.hash(requireSeedPassword(), 10)

  // 📚 Una transacción hace que el seed sea atómico: o se escriben todos los datos relacionados
  //    o Prisma revierte el conjunto completo si aparece un error a mitad del proceso.
  await prisma.$transaction(async (tx) => {
    const teamIds = new Map<string, number>()
    const logroIds = new Map<string, number>()
    const userIds = new Map<string, number>()

    for (const teamSeed of teams) {
      // 📚 upsert usa el slug único como identidad estable y permite repetir el seed sin
      //    duplicar tenants: actualiza si ya existe y crea solo la primera vez.
      const team = await tx.team.upsert({
        where: { slug: teamSeed.slug },
        update: { nombre: teamSeed.nombre },
        create: { slug: teamSeed.slug, nombre: teamSeed.nombre },
      })
      teamIds.set(teamSeed.slug, team.id)

      for (const [index, logroSeed] of teamSeed.logros.entries()) {
        // 📚 Criterios del catálogo real: no son un progreso automático ni una concesión.
        const data = { ...logroSeed, criterios: [logroSeed.descripcion, "Confirmar el resultado con un administrador del equipo."], createdAt: fixtureDate(1 + index) }
        const existing = await tx.logro.findFirst({
          where: { teamId: team.id, nombre: logroSeed.nombre },
        })
        const logro = existing
          ? await tx.logro.update({ where: { id: existing.id }, data })
          : await tx.logro.create({ data: { ...data, teamId: team.id } })
        logroIds.set(`${teamSeed.slug}:${logroSeed.nombre}`, logro.id)
      }
    }

    for (const [index, userSeed] of users.entries()) {
      const teamId = teamIds.get(userSeed.teamSlug)
      if (!teamId) throw new Error(`Equipo de seed no encontrado: ${userSeed.teamSlug}`)

      // 📚 El upsert también restablece la contraseña de todas las cuentas de prueba al valor
      //    indicado en esta ejecución, sin revelar ese valor en la salida del comando.
      const user = await tx.user.upsert({
        where: { email: userSeed.email },
        update: { password: passwordHash, isSuperAdmin: userSeed.isSuperAdmin, displayName: userSeed.displayName },
        create: { email: userSeed.email, password: passwordHash, isSuperAdmin: userSeed.isSuperAdmin, displayName: userSeed.displayName },
      })
      await tx.teamMembership.upsert({
        where: { userId_teamId: { userId: user.id, teamId } },
        update: { role: userSeed.role, joinedAt: fixtureDate(1 + index) },
        create: { userId: user.id, teamId, role: userSeed.role, joinedAt: fixtureDate(1 + index) },
      })
      userIds.set(userSeed.email, user.id)
    }

    // 📚 Ana pertenece a ambos equipos: detecta agregados que olviden filtrar logro.teamId.
    const sharedUserId = userIds.get("ana@halcones.test")!
    const secondTeamId = teamIds.get("lobos")!
    await tx.teamMembership.upsert({
      where: { userId_teamId: { userId: sharedUserId, teamId: secondTeamId } },
      update: { role: "PLAYER", joinedAt: fixtureDate(14) },
      create: { userId: sharedUserId, teamId: secondTeamId, role: "PLAYER", joinedAt: fixtureDate(14) },
    })

    for (const [index, assignment] of assignments.entries()) {
      const userId = userIds.get(assignment.email)
      const logroId = logroIds.get(`${assignment.teamSlug}:${assignment.logro}`)
      if (!userId || !logroId) throw new Error("Asignación de seed con referencias incompletas.")

      // 📚 La clave @@unique([userId, logroId]) permite un upsert idempotente: una persona no
      //    recibe dos veces el mismo logro aunque el seed se ejecute repetidamente.
      await tx.userLogro.upsert({
        where: { userId_logroId: { userId, logroId } },
        update: { fecha: fixtureDate(16 + Math.floor(index / 12), 9 + index % 12) },
        create: { userId, logroId, fecha: fixtureDate(16 + Math.floor(index / 12), 9 + index % 12) },
      })
    }

    for (const [index, request] of requests.entries()) {
      const userId = userIds.get(request.email)!
      const logroId = logroIds.get(`halcones:${teams[0].logros[request.index].nombre}`)!
      const createdAt = fixtureDate(14, 9 + index)
      // 📚 La fecha fija identifica esta fila del fixture sin prohibir reintentos futuros del jugador.
      // 📚 No borramos otras solicitudes: la idempotencia cubre solo los registros declarados aquí.
      const existing = await tx.solicitudLogro.findFirst({ where: { userId, logroId, createdAt }, orderBy: { id: "asc" } })
      const rejectionReason = request.status === "REJECTED"
        ? (request.email === "ana@halcones.test" ? "Todavía falta aplicar la corrección acordada con el equipo." : "El objetivo debe completarse antes de solicitar su obtención.")
        : null
      const data = { userId, logroId, createdAt, status: request.status, rejectionReason, reviewedAt: request.status === "PENDING" ? null : fixtureDate(15, 9 + index) }
      if (existing) await tx.solicitudLogro.update({ where: { id: existing.id }, data })
      else await tx.solicitudLogro.create({ data })
    }

    for (const [index, invitation] of invitations.entries()) {
      // 📚 El hash estable sirve de clave; el cifrado usa un IV nuevo sin alterar el código visible.
      const token = `halcones-visual-local-${invitation.key}-20260920`
      const tokenHash = hashInvitationToken(token)
      const { key: _key, ...values } = invitation
      const data = { ...values, teamId: teamIds.get("halcones")!, createdById: userIds.get("test@halcones.com")!, createdAt: fixtureDate(10 + index), tokenCiphertext: encryptInvitationToken(token) }
      await tx.teamInvitation.upsert({ where: { tokenHash }, update: data, create: { ...data, tokenHash } })
    }

    for (const [index, proposal] of proposals.entries()) {
      const teamId = teamIds.get("halcones")!
      const userId = userIds.get(proposal.email)!
      const createdAt = fixtureDate(16, 9 + index)
      const reviewedAt = proposal.status === "PENDING" ? null : fixtureDate(18, 9 + index)
      // 📚 Fecha + autor + nombre identifican solo esta fila conocida; no borramos otras propuestas.
      const existing = await tx.propuestaLogro.findFirst({ where: { teamId, userId, nombre: proposal.nombre, createdAt }, orderBy: { id: "asc" } })
      let logroId: number | null = null
      if (proposal.status === "ACCEPTED") {
        // 📚 Reutilizamos el vínculo al repetir el seed; así no nacen copias nuevas del catálogo.
        const previousLogro = existing?.logroId
          ? await tx.logro.findFirst({ where: { id: existing.logroId, teamId } })
          : await tx.logro.findFirst({ where: { teamId, nombre: proposal.nombre }, orderBy: { id: "asc" } })
        const data = { teamId, nombre: proposal.nombre, descripcion: proposal.descripcion, criterios: proposal.criterios, puntos: proposal.puntos!, categoria: proposal.categoria!, createdAt: reviewedAt! }
        const logro = previousLogro
          ? await tx.logro.update({ where: { id: previousLogro.id }, data })
          : await tx.logro.create({ data })
        logroId = logro.id
      }
      const rejectionReason = proposal.status === "REJECTED"
        ? (index === 4 ? "El criterio exige disponibilidad ilimitada; necesitamos un objetivo acotado." : "La propuesta debe reconocer una contribución al equipo, no solo un resultado individual.")
        : null
      const data = { teamId, userId, nombre: proposal.nombre, descripcion: proposal.descripcion, criterios: proposal.criterios, status: proposal.status, rejectionReason, createdAt, reviewedAt, logroId }
      if (existing) await tx.propuestaLogro.update({ where: { id: existing.id }, data })
      else await tx.propuestaLogro.create({ data })
    }
    // 📚 Más filas implican más viajes a PostgreSQL; un timeout acotado evita el límite corto por defecto.
  }, { timeout: 30000 })

  console.info(
    `Seed completado: ${teams.length} equipos, ${teams.reduce((total, team) => total + team.logros.length, 0) + proposals.filter(proposal => proposal.status === "ACCEPTED").length} logros, ${users.length} usuarios, ${assignments.length} asignaciones, ${requests.length} solicitudes, ${invitations.length} invitaciones y ${proposals.length} propuestas.`,
  )
}

main()
  .catch(() => {
    // 📚 No volcamos el error completo: algunos drivers incluyen detalles de conexión que no
    //    deben acabar en logs. El proceso conserva el código 1 para señalar el fallo al CLI.
    console.error("No se pudo completar el seed. Revisa la conexión y la configuración local.")
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
