import "dotenv/config"
import bcrypt from "bcryptjs"
import prisma from "../src/lib/prisma"

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
  { email: "test@halcones.com", teamSlug: "halcones", isSuperAdmin: true },
  { email: "ana@halcones.test", teamSlug: "halcones", isSuperAdmin: false },
  { email: "marcos@halcones.test", teamSlug: "halcones", isSuperAdmin: false },
  { email: "lucia@lobos.test", teamSlug: "lobos", isSuperAdmin: false },
]

const assignments = [
  { email: "test@halcones.com", teamSlug: "halcones", logro: "Primer vuelo" },
  { email: "test@halcones.com", teamSlug: "halcones", logro: "Trabajo en equipo" },
  { email: "ana@halcones.test", teamSlug: "halcones", logro: "Primer vuelo" },
  { email: "ana@halcones.test", teamSlug: "halcones", logro: "Mentoría" },
  { email: "marcos@halcones.test", teamSlug: "halcones", logro: "Caza nocturna" },
  { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Aullido lunar" },
  { email: "lucia@lobos.test", teamSlug: "lobos", logro: "Manada unida" },
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

      for (const logroSeed of teamSeed.logros) {
        const existing = await tx.logro.findFirst({
          where: { teamId: team.id, nombre: logroSeed.nombre },
        })
        const logro = existing
          ? await tx.logro.update({ where: { id: existing.id }, data: logroSeed })
          : await tx.logro.create({ data: { ...logroSeed, teamId: team.id } })
        logroIds.set(`${teamSeed.slug}:${logroSeed.nombre}`, logro.id)
      }
    }

    for (const userSeed of users) {
      const teamId = teamIds.get(userSeed.teamSlug)
      if (!teamId) throw new Error(`Equipo de seed no encontrado: ${userSeed.teamSlug}`)

      // 📚 El upsert también restablece la contraseña de todas las cuentas de prueba al valor
      //    indicado en esta ejecución, sin revelar ese valor en la salida del comando.
      const user = await tx.user.upsert({
        where: { email: userSeed.email },
        update: { password: passwordHash, isSuperAdmin: userSeed.isSuperAdmin },
        create: { email: userSeed.email, password: passwordHash, isSuperAdmin: userSeed.isSuperAdmin },
      })
      await tx.teamMembership.upsert({
        where: { userId_teamId: { userId: user.id, teamId } },
        update: { role: userSeed.email === "test@halcones.com" ? "TEAM_ADMIN" : "PLAYER" },
        create: { userId: user.id, teamId, role: userSeed.email === "test@halcones.com" ? "TEAM_ADMIN" : "PLAYER" },
      })
      userIds.set(userSeed.email, user.id)
    }

    for (const assignment of assignments) {
      const userId = userIds.get(assignment.email)
      const logroId = logroIds.get(`${assignment.teamSlug}:${assignment.logro}`)
      if (!userId || !logroId) throw new Error("Asignación de seed con referencias incompletas.")

      // 📚 La clave @@unique([userId, logroId]) permite un upsert idempotente: una persona no
      //    recibe dos veces el mismo logro aunque el seed se ejecute repetidamente.
      await tx.userLogro.upsert({
        where: { userId_logroId: { userId, logroId } },
        update: {},
        create: { userId, logroId },
      })
    }
  })

  console.info(
    `Seed completado: ${teams.length} equipos, ${teams.reduce((total, team) => total + team.logros.length, 0)} logros, ${users.length} usuarios y ${assignments.length} asignaciones.`,
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
