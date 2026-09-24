import express from "express"
import prisma from "../lib/prisma"
import { resolveTeam } from "../middleware/resolveTeam"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { validate } from "../middleware/validate"
import { crearLogroSchema, achievementConfigurationSchema } from "../schemas/logros"
import { AppError } from "../errors/AppError"
import { publicName, readCatalog, readTeam } from "../lib/teamRead"
import { rejectAchievementRequestSchema, requestStatusSchema } from "../schemas/achievementRequests"
import propuestasRouter from "./propuestas"
import seasonsRouter from "./seasons"
import progressRouter from "./progress"
import { awardSeasonId } from "../lib/seasonContext"
import { isAchievementHidden, presentAchievement, revealedAchievementIds } from "../lib/achievementVisibility"
import { grantAchievement } from "../lib/achievementProgress"
import { progressDTO } from "../lib/achievementProgressState"
import { teamAliasSchema } from "../schemas/profile"

// 📚 ROUTER SCOPED POR EQUIPO. Se monta en server.ts como app.use("/equipos/:slug", router),
//    así que aquí las rutas son relativas: "/logros" = "/equipos/:slug/logros".
// 📚 mergeParams: true es OBLIGATORIO. El :slug lo captura el prefijo del PADRE (server.ts);
//    sin mergeParams, un router hijo NO ve los params del padre y req.params.slug sería
//    undefined → resolveTeam buscaría where:{slug:undefined} → 404 en todo. Con él, se heredan.
const router = express.Router({mergeParams: true})

function parsePositiveId(value: string | string[]) {
  // 📚 Array.isArray hace narrowing de la unión y rechaza parámetros repetidos antes
  //    de Number(), que convertiría sorprendentemente ["1"] en un identificador válido.
  if (Array.isArray(value)) throw new AppError(400, "ID no válido")
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "ID no válido")
  return id
}

// 📚 resolveTeam a nivel de router: corre ANTES de cada ruta de abajo (composición de middlewares).
//    Traduce :slug → req.team (o lanza 404). Puesto aquí una vez, no hay que repetirlo por ruta.
//    Es lo que garantiza que req.team exista en los handlers y justifica el "!" de req.team!.id.
router.use(resolveTeam)
router.use(seasonsRouter)
router.use(propuestasRouter)
router.use(progressRouter)

// 📚 Autorización contextual: ser miembro permite editar el alias propio, no el de
// 📚 otro jugador. Tanto userId como teamId proceden de los middleware, nunca del body.
router.patch("/mi-alias", authMiddleware, requireTeamMember, validate(teamAliasSchema), async (req, res) => {
  const { displayName } = req.body
  // 📚 El filtro sigue presente al escribir: si se revocó la membresía después del
  // 📚 middleware, no se recrea ni se modifica ninguna pertenencia ajena.
  const updated = await prisma.teamMembership.updateMany({
    where: { userId: req.userId!, teamId: req.team!.id },
    data: { displayName },
  })
  if (updated.count !== 1) throw new AppError(403, "No perteneces a este equipo")
  res.json({ displayName })
})

// 📚 Contexto fiable del shell sin cambiar JWT ni confiar en un nombre derivado del slug.
router.get("/contexto", authMiddleware, requireTeamMember, async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId }, select: { id: true, firstName: true, lastName: true } })
  res.json({ team: req.team, me: { id: user.id, displayName: publicName({ displayName: req.teamMembership!.displayName, user }), role: req.teamMembership!.role } })
})

// 📚 Ambas vistas comparten el mismo orden y la misma definición de puntos.
router.get("/jugadores", authMiddleware, requireTeamMember, async (req, res) => {
  res.json((await readTeam(req.team!.id))!.players)
})
router.get("/ranking", authMiddleware, requireTeamMember, async (req, res) => {
  const { season, players, totals } = (await readTeam(req.team!.id))!
  res.json({ season, players, totals })
})

// 📚 El feed solo representa otorgamientos persistidos; no inventa retos, niveles ni actividad social.
router.get("/dashboard", authMiddleware, requireTeamMember, async (req, res) => {
  const { season, players, totals, catalog, awards, holderCounts } = (await readTeam(req.team!.id))!
  // 📚 El panel personal usa la visibilidad de jugador incluso para un administrador:
  // 📚 conocer un secreto para gestionarlo no lo añade a su denominador de progreso.
  const personalCatalog = (await readCatalog(req.team!.id, req.userId!)).filter(logro => !logro.isHidden)
  const progressCounts = { notStarted: 0, inProgress: 0, eligible: 0, awarded: 0 }
  for (const logro of personalCatalog) {
    if (logro.earnedByMe) progressCounts.awarded++
    else if (logro.progress?.status === "ELIGIBLE") progressCounts.eligible++
    else if (logro.progress?.status === "IN_PROGRESS") progressCounts.inProgress++
    else progressCounts.notStarted++
  }
  const counted = catalog.map(logro => ({ ...logro, holdersCount: holderCounts.get(logro.id) ?? 0 }))
  const earned = counted.filter(logro => logro.holdersCount > 0)
  const me = players.find(player => player.id === req.userId)!
  const users = new Map(players.map(player => [player.id, { id: player.id, displayName: player.displayName }]))
  const logros = new Map(catalog.map(logro => [logro.id, logro]))
  res.json({ season, totals, me: { puntos: me.puntos, logrosCount: me.logrosCount, position: me.position, visibleCatalog: personalCatalog.length, progressCounts },
    topPlayers: players.slice(0, 3), recentAchievements: counted.slice(0, 3),
    recentAwards: awards.slice(0, 6).map(award => ({ id: award.id, fecha: award.fecha, user: users.get(award.userId), logro: logros.get(award.logroId) })),
    mostEarned: [...earned].sort((a, b) => b.holdersCount - a.holdersCount || a.id - b.id)[0] ?? null,
    rarestEarned: [...earned].sort((a, b) => a.holdersCount - b.holdersCount || a.id - b.id)[0] ?? null })
})



// 📚 La aceptación es una única transacción: cambiar el estado y otorgar el logro se
//    confirman juntos. Si falla una escritura, Prisma revierte ambas y evita datos incoherentes.
router.post("/admin/solicitudes/:id/aceptar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = parsePositiveId(req.params.id)
  const solicitud = await prisma.$transaction(async (tx) => {
    const pending = await tx.solicitudLogro.findFirst({
      where: { id, status: "PENDING", logro: { teamId: req.team!.id } },
    })
    if (!pending) throw new AppError(404, "Solicitud pendiente no encontrada")

    // 📚 updateMany incluye status=PENDING como compare-and-set: dos revisiones simultáneas
    //    no pueden procesar la misma solicitud dos veces.
    const updated = await tx.solicitudLogro.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "ACCEPTED", reviewedAt: new Date() },
    })
    if (updated.count !== 1) throw new AppError(409, "La solicitud ya fue procesada")

    await grantAchievement(tx, req.team!.id, pending.logroId, pending.userId, pending.seasonId)
    return tx.solicitudLogro.findUniqueOrThrow({ where: { id } })
  })
  res.json(solicitud)
})

// 📚 Rechazar no crea relaciones: la condición PENDING hace atómica la transición y
//    evita sobrescribir una decisión tomada por otra petición concurrente.
router.post("/admin/solicitudes/:id/rechazar", authMiddleware, requireTeamAdmin, validate(rejectAchievementRequestSchema), async (req, res) => {
  const id = parsePositiveId(req.params.id)
  const updated = await prisma.solicitudLogro.updateMany({
    where: { id, status: "PENDING", logro: { teamId: req.team!.id } },
    data: { status: "REJECTED", reviewedAt: new Date(), rejectionReason: req.body.reason },
  })
  if (updated.count !== 1) throw new AppError(404, "Solicitud pendiente no encontrada")
  res.json(await prisma.solicitudLogro.findUniqueOrThrow({ where: { id } }))
})


// 📚 GET lista: EL scoping. where:{ teamId } filtra por ESTE equipo → un equipo nunca ve los
//    logros de otro. Antes (routes/logros.ts, borrado) era findMany() sin filtro = todos mezclados.
router.get("/logros", authMiddleware, requireTeamMember, async (req, res) => {
    // 📚 req.team!.id: "!" (non-null assertion) legítimo — resolveTeam garantiza que req.team existe
    //    (o ya lanzó 404 y no llegamos aquí). TS lo ve como Team|undefined por el "?" del .d.ts; el
    //    "!" cierra el hueco entre lo que sabemos y lo que el compilador puede probar. Distinto del
    //    "!" que quitamos de JWT_SECRET, que tapaba un fallo real.
    const logros = await readCatalog(req.team!.id, req.userId!, undefined, req.teamMembership!.role === "TEAM_ADMIN")
    res.json(logros)
})

router.get("/logros/:id", authMiddleware, requireTeamMember, async (req, res) => {
    // 📚 Los params llegan como string → Number() para consultar la BD con un int.
    const id = parsePositiveId(req.params.id)
    // 📚 El helper conserva id Y teamId en la consulta al enriquecer el catálogo.
    // 📚 El teamId en el where es un CANDADO anti-fuga: sin él, /equipos/lobos/logros/1 devolvería
    //    un logro de Halcones. Con él, un logro de otro equipo cae al 404 de abajo (verificado).
    const [logro] = await readCatalog(req.team!.id, req.userId!, id, req.teamMembership!.role === "TEAM_ADMIN")

    if (!logro) {
        res.status(404).json({ error: "Logro no encontrado" })
        return
    }
    res.json(logro)
})

// 📚 Solo la configuración de secreto cambia en V1: no reinterpretamos avances guardados
// 📚 alterando tipo/objetivo; el filtro tenant sigue siendo obligatorio también al escribir.
router.patch("/logros/:id/configuracion", authMiddleware, requireTeamAdmin, validate(achievementConfigurationSchema), async (req, res) => {
  const id = parsePositiveId(req.params.id)
  const updated = await prisma.logro.updateMany({ where: { id, teamId: req.team!.id }, data: { isSecret: req.body.isSecret } })
  if (updated.count !== 1) throw new AppError(404, "Logro no encontrado")
  res.json((await readCatalog(req.team!.id, req.userId!, id, true))[0])
})

// 📚 El servidor toma userId del JWT y teamId del logro ya scoped; el cliente solo elige
//    qué logro reclama, por lo que no puede crear solicitudes en nombre de otra persona o tenant.
router.post("/logros/:id/solicitudes", authMiddleware, requireTeamMember, async (req, res) => {
  const logroId = parsePositiveId(req.params.id)
  const logro = await prisma.logro.findFirst({ where: { id: logroId, teamId: req.team!.id } })
  if (!logro) throw new AppError(404, "Logro no encontrado")

  if (isAchievementHidden(logro, await revealedAchievementIds(req.team!.id), req.teamMembership!.role === "TEAM_ADMIN")) {
    throw new AppError(409, "Este logro todavía es secreto")
  }

  const seasonId = await awardSeasonId(prisma, req.team!.id, logro.scope)

  const alreadyEarned = await prisma.userLogro.findFirst({
    where: { userId: req.userId!, logroId, seasonId },
  })
  if (alreadyEarned) throw new AppError(409, "Ya tienes este logro")

  const pending = await prisma.solicitudLogro.findFirst({
    where: { userId: req.userId, logroId, seasonId, status: "PENDING" },
  })
  if (pending) throw new AppError(409, "Ya tienes una solicitud pendiente para este logro")

  const solicitud = await prisma.solicitudLogro.create({
    data: { userId: req.userId!, logroId, seasonId },
  })
  res.status(201).json(solicitud)
})

// 📚 El filtro atraviesa la relación logro → teamId: aunque un usuario pertenezca a varios
//    equipos, cada URL devuelve únicamente su historial dentro del tenant actual.
router.get("/solicitudes", authMiddleware, requireTeamMember, async (req, res) => {
  const solicitudes = await prisma.solicitudLogro.findMany({
    where: { userId: req.userId, logro: { teamId: req.team!.id } },
    include: { logro: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
  const revealed = await revealedAchievementIds(req.team!.id)
  const admin = req.teamMembership!.role === "TEAM_ADMIN"
  res.json(solicitudes.map(row => ({ ...row,
    // 📚 El motivo libre podría citar criterios: se censura junto con la definición oculta.
    rejectionReason: isAchievementHidden(row.logro, revealed, admin) ? null : row.rejectionReason,
    logro: presentAchievement(row.logro, revealed, admin),
  })))
})

// 📚 La cola administrativa usa el mismo candado de tenant, pero incluye el usuario y el
//    logro necesarios para que TEAM_ADMIN pueda revisar una solicitud sin exponer contraseñas.
router.get("/admin/solicitudes", authMiddleware, requireTeamAdmin, async (req, res) => {
  // 📚 safeParse rechaza arrays/objetos y valores desconocidos sin mutar req.query de Express 5.
  const parsed = requestStatusSchema.safeParse(req.query.status)
  if (!parsed.success) throw new AppError(400, "Estado de solicitud no válido")
  const solicitudes = await prisma.solicitudLogro.findMany({
    where: { ...(parsed.data === "all" ? {} : { status: parsed.data }), logro: { teamId: req.team!.id } },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, memberships: { where: { teamId: req.team!.id }, select: { displayName: true }, take: 1 } } },
      logro: true,
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  res.json(solicitudes.map(({ user, ...solicitud }) => ({
    ...solicitud,
    user: { id: user.id, email: user.email, displayName: publicName({ displayName: user.memberships[0]?.displayName ?? null, user }) },
  })))
})

// 📚 El ID no basta: cruzarlo con el tenant evita revelar solicitudes de otro equipo.
router.get("/admin/solicitudes/:id", authMiddleware, requireTeamAdmin, async (req, res) => {
  const solicitud = await prisma.solicitudLogro.findFirst({
    where: { id: parsePositiveId(req.params.id), logro: { teamId: req.team!.id } },
    include: { logro: true, user: { select: { id: true, email: true, firstName: true, lastName: true, memberships: { where: { teamId: req.team!.id }, select: { displayName: true }, take: 1 } } } },
  })
  if (!solicitud) throw new AppError(404, "Solicitud no encontrada")
  const { user, ...data } = solicitud
  // 📚 La solicitud guarda su periodo: consultar la temporada activa mezclaría dos ediciones.
  // 📚 Esta lectura es solo administrativa; conserva el filtro tenant del detalle y no concede nada.
  const [counter, award, season] = await Promise.all([
    solicitud.logro.kind === "PROGRESSIVE"
      ? prisma.achievementProgress.findFirst({ where: { userId: solicitud.userId, logroId: solicitud.logroId, seasonId: solicitud.seasonId } })
      : null,
    prisma.userLogro.findFirst({ where: { userId: solicitud.userId, logroId: solicitud.logroId, seasonId: solicitud.seasonId } }),
    solicitud.seasonId === null ? null : prisma.season.findFirst({ where: { id: solicitud.seasonId, teamId: req.team!.id }, select: { id: true, name: true, status: true } }),
  ])
  const progress = solicitud.logro.kind === "PROGRESSIVE" && solicitud.logro.targetValue !== null
    ? progressDTO(counter?.currentValue ?? 0, solicitud.logro.targetValue, solicitud.seasonId, Boolean(award))
    : null
  res.json({ ...data, progress, season, user: { id: user.id, email: user.email, displayName: publicName({ displayName: user.memberships[0]?.displayName ?? null, user }) } })
})

// 📚 Esta lista devuelve solo identidad y rol de miembros del tenant; nunca expone hashes
//    ni permite que el cliente elija usuarios pertenecientes a otro equipo.
router.get("/admin/miembros", authMiddleware, requireTeamAdmin, async (req, res) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: req.team!.id },
    select: { displayName: true, role: true, joinedAt: true, user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
  })
  res.json(memberships.map(({ displayName, role, joinedAt, user }) => ({ ...user, displayName: publicName({ displayName, user }), role, joinedAt })))
})

// 📚 La asignación directa valida ambos IDs y vuelve a comprobar en BD que usuario y logro
//    pertenecen al tenant de la URL; el @@unique evita otorgar dos veces el mismo logro.
router.post("/admin/asignaciones", authMiddleware, requireTeamAdmin, async (req, res) => {
  const userId = parsePositiveId(String(req.body?.userId ?? ""))
  const logroId = parsePositiveId(String(req.body?.logroId ?? ""))
  const [membership, logro] = await Promise.all([
    prisma.teamMembership.findUnique({ where: { userId_teamId: { userId, teamId: req.team!.id } } }),
    prisma.logro.findFirst({ where: { id: logroId, teamId: req.team!.id } }),
  ])
  if (!membership || !logro) throw new AppError(404, "Jugador o logro no encontrado en este equipo")

  const award = await prisma.$transaction(async tx => {
    const seasonId = await awardSeasonId(tx, req.team!.id, logro.scope)
    return grantAchievement(tx, req.team!.id, logroId, userId, seasonId)
  })
  res.status(201).json(award)
})


// 📚 POST (escritura): cadena authMiddleware → validate → handler. Orden intencionado: primero auth
//    (sin token, 401 y no gastamos esfuerzo), luego validar el body, y solo entonces crear.
router.post("/logros", authMiddleware, requireTeamAdmin, validate(crearLogroSchema), async (req, res) => {
  const { nombre, puntos, descripcion, categoria, criterios, scope, kind, targetValue, isSecret } = req.body

  // 📚 teamId NO viene del body: lo dicta el :slug de la URL (ya resuelto en req.team). Que el
  //    cliente eligiera el equipo sería un fallo de seguridad. Añadir teamId aquí es además lo que
  //    arregla el "Property 'team' is missing" que rompía el build tras la migración multi-tenant.
  const nuevoLogro = await prisma.logro.create({
    data: { nombre, puntos, descripcion, categoria, criterios, scope, kind, targetValue, isSecret, teamId: req.team!.id }
  })

  res.status(201).json(nuevoLogro)
})



export default router
