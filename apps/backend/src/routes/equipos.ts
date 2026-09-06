import express from "express"
import prisma from "../lib/prisma"
import { resolveTeam } from "../middleware/resolveTeam"
import { authMiddleware } from "../middleware/auth"
import { requireTeamAdmin, requireTeamMember } from "../middleware/teamAccess"
import { validate } from "../middleware/validate"
import { crearLogroSchema } from "../schemas/logros"
import { AppError } from "../errors/AppError"

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

    await tx.userLogro.upsert({
      where: { userId_logroId: { userId: pending.userId, logroId: pending.logroId } },
      update: {},
      create: { userId: pending.userId, logroId: pending.logroId },
    })
    return tx.solicitudLogro.findUniqueOrThrow({ where: { id } })
  })
  res.json(solicitud)
})

// 📚 Rechazar no crea relaciones: la condición PENDING hace atómica la transición y
//    evita sobrescribir una decisión tomada por otra petición concurrente.
router.post("/admin/solicitudes/:id/rechazar", authMiddleware, requireTeamAdmin, async (req, res) => {
  const id = parsePositiveId(req.params.id)
  const updated = await prisma.solicitudLogro.updateMany({
    where: { id, status: "PENDING", logro: { teamId: req.team!.id } },
    data: { status: "REJECTED", reviewedAt: new Date() },
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
    const logros = await prisma.logro.findMany({
        where: { teamId: req.team!.id }
    })
    res.json(logros)
})

router.get("/logros/:id", authMiddleware, requireTeamMember, async (req, res) => {
    // 📚 Los params llegan como string → Number() para consultar la BD con un int.
    const id = Number(req.params.id)
    // 📚 findFirst (no findUnique) porque filtramos por DOS columnas: id Y teamId. findUnique solo
    //    admite campos únicos en el where, y teamId no es único (un equipo tiene muchos logros).
    // 📚 El teamId en el where es un CANDADO anti-fuga: sin él, /equipos/lobos/logros/1 devolvería
    //    un logro de Halcones. Con él, un logro de otro equipo cae al 404 de abajo (verificado).
    const logro = await prisma.logro.findFirst({
        where: { id, teamId: req.team!.id }
    })

    if (!logro) {
        res.status(404).json({ error: "Logro no encontrado" })
        return
    }
    res.json(logro)
})

// 📚 El servidor toma userId del JWT y teamId del logro ya scoped; el cliente solo elige
//    qué logro reclama, por lo que no puede crear solicitudes en nombre de otra persona o tenant.
router.post("/logros/:id/solicitudes", authMiddleware, requireTeamMember, async (req, res) => {
  const logroId = parsePositiveId(req.params.id)
  const logro = await prisma.logro.findFirst({ where: { id: logroId, teamId: req.team!.id } })
  if (!logro) throw new AppError(404, "Logro no encontrado")

  const alreadyEarned = await prisma.userLogro.findUnique({
    where: { userId_logroId: { userId: req.userId!, logroId } },
  })
  if (alreadyEarned) throw new AppError(409, "Ya tienes este logro")

  const pending = await prisma.solicitudLogro.findFirst({
    where: { userId: req.userId, logroId, status: "PENDING" },
  })
  if (pending) throw new AppError(409, "Ya tienes una solicitud pendiente para este logro")

  const solicitud = await prisma.solicitudLogro.create({
    data: { userId: req.userId!, logroId },
  })
  res.status(201).json(solicitud)
})

// 📚 El filtro atraviesa la relación logro → teamId: aunque un usuario pertenezca a varios
//    equipos, cada URL devuelve únicamente su historial dentro del tenant actual.
router.get("/solicitudes", authMiddleware, requireTeamMember, async (req, res) => {
  const solicitudes = await prisma.solicitudLogro.findMany({
    where: { userId: req.userId, logro: { teamId: req.team!.id } },
    include: { logro: true },
    orderBy: { createdAt: "desc" },
  })
  res.json(solicitudes)
})

// 📚 La cola administrativa usa el mismo candado de tenant, pero incluye el usuario y el
//    logro necesarios para que TEAM_ADMIN pueda revisar una solicitud sin exponer contraseñas.
router.get("/admin/solicitudes", authMiddleware, requireTeamAdmin, async (req, res) => {
  const solicitudes = await prisma.solicitudLogro.findMany({
    where: { status: "PENDING", logro: { teamId: req.team!.id } },
    include: {
      user: { select: { id: true, email: true } },
      logro: true,
    },
    orderBy: { createdAt: "asc" },
  })
  res.json(solicitudes)
})

// 📚 Esta lista devuelve solo identidad y rol de miembros del tenant; nunca expone hashes
//    ni permite que el cliente elija usuarios pertenecientes a otro equipo.
router.get("/admin/miembros", authMiddleware, requireTeamAdmin, async (req, res) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { teamId: req.team!.id },
    select: { role: true, user: { select: { id: true, email: true } } },
    orderBy: { joinedAt: "asc" },
  })
  res.json(memberships.map(({ role, user }) => ({ ...user, role })))
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

  const existing = await prisma.userLogro.findUnique({ where: { userId_logroId: { userId, logroId } } })
  if (existing) throw new AppError(409, "Este jugador ya tiene el logro")
  res.status(201).json(await prisma.userLogro.create({ data: { userId, logroId } }))
})


// 📚 POST (escritura): cadena authMiddleware → validate → handler. Orden intencionado: primero auth
//    (sin token, 401 y no gastamos esfuerzo), luego validar el body, y solo entonces crear.
router.post("/logros", authMiddleware, requireTeamAdmin, validate(crearLogroSchema), async (req, res) => {
  const { nombre, puntos }: { nombre: string; puntos: number } = req.body ?? {}

  // 📚 teamId NO viene del body: lo dicta el :slug de la URL (ya resuelto en req.team). Que el
  //    cliente eligiera el equipo sería un fallo de seguridad. Añadir teamId aquí es además lo que
  //    arregla el "Property 'team' is missing" que rompía el build tras la migración multi-tenant.
  const nuevoLogro = await prisma.logro.create({
    data: { nombre, puntos, teamId: req.team!.id }
  })

  res.status(201).json(nuevoLogro)
})



export default router
