import express from "express"
import crypto from "node:crypto"
import prisma from "../lib/prisma"
import { authMiddleware } from "../middleware/auth"
import { AppError } from "../errors/AppError"
import { decryptInvitationToken, encryptInvitationToken, hashInvitationToken } from "../lib/invitationToken"
import { validate } from "../middleware/validate"
import { crearTeamRequestSchema } from "../schemas/teamRequests"
import { requireSuperAdmin } from "../middleware/requireSuperAdmin"

const router = express.Router()

// 📚 normalize("NFD") separa letra y acento; después eliminamos la marca y reducimos
//    cualquier separador a un solo guion para obtener una URL estable sin dependencias.
function createSlug(teamName: string) {
  return teamName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

// 📚 Rechazar solo modifica una fila, así que un `update` ya es atómico y no necesita
//    una transacción; `reviewedAt` conserva cuándo se tomó la decisión administrativa.
router.post("/solicitudes/:id/rechazar", authMiddleware, requireSuperAdmin, async (req, res) => {
  const requestId = Number(req.params.id)
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError(400, "ID de solicitud no válido")
  }
  const request = await prisma.teamRequest.findUnique({ where: { id: requestId } })
  if (!request) {
    throw new AppError(404, "Solicitud de equipo no encontrada")
  }
  if (request.status !== "PENDING") {
    throw new AppError(409, "La solicitud ya fue procesada")
  }
  const updatedRequest = await prisma.teamRequest.update({
    where: { id: request.id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
    },
  })
  res.json(updatedRequest)
})

// 📚 `_count` delega los conteos a PostgreSQL y evita descargar las colecciones completas;
//    el SUPER_ADMIN recibe solo el resumen necesario para supervisar la plataforma.
router.get("/", authMiddleware, requireSuperAdmin, async (_req, res) => {
  const teams = await prisma.team.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { miembros: true, logros: true } },
    },
  })
  res.json(teams)
})

// 📚 La aceptación es atómica: equipo, membresía y estado se confirman juntos;
//    si una escritura falla, Prisma revierte las anteriores y evita datos incompletos.
router.post("/solicitudes/:id/aceptar", authMiddleware, requireSuperAdmin, async (req, res) => {
  const requestId = Number(req.params.id)
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new AppError(400, "ID de solicitud no válido")
  }
  // 📚 `tx` es el cliente ligado a esta transacción: usarlo en todas las consultas
  //    mantiene la lectura y las tres escrituras dentro de la misma unidad de trabajo.
  const team = await prisma.$transaction(async (tx) => {
    const request = await tx.teamRequest.findUnique({ where: { id: requestId } })
    if (!request) {
      throw new AppError(404, "Solicitud de equipo no encontrada")
    }
    if (request.status !== "PENDING") {
      throw new AppError(409, "La solicitud ya fue procesada")
    }
    const slug = createSlug(request.teamName) || `equipo-${request.id}`
    const existingTeam = await tx.team.findUnique({ where: { slug } })

    const finalSlug = existingTeam
      ? `${slug}-${request.id}`
      : slug

    const createdTeam = await tx.team.create({
      data: {
        nombre: request.teamName,
        slug: finalSlug,
      },
    })
    await tx.teamMembership.create({
      data: {
        userId: request.userId,
        teamId: createdTeam.id,
        role: "TEAM_ADMIN",
      },
    })
    await tx.teamRequest.update({
      where: { id: request.id },
      data: {
        status: "ACCEPTED",
        reviewedAt: new Date(),
      },
    })
    return createdTeam
  })
  res.status(201).json(team)
})


// 📚 La cadena de middleware autentica antes de validar y escribir: la solicitud siempre
//    queda vinculada al userId del JWT, nunca a una identidad enviada en el formulario.
router.post("/solicitudes", authMiddleware, validate(crearTeamRequestSchema), async (req, res) => {
  const { teamName, officialEmail, message } = req.body as {
    teamName: string
    officialEmail: string
    message: string
  }
  // 📚 Filtrar por PENDING permite volver a solicitar tras un rechazo, pero evita dos
  //    solicitudes activas del mismo usuario; 409 representa ese conflicto de estado.
  const existingRequest = await prisma.teamRequest.findFirst({ where: { userId: req.userId, status: "PENDING" } })
  if (existingRequest) {
    throw new AppError(409, "Ya existe una solicitud de equipo pendiente para este usuario")
  }
  const request = await prisma.teamRequest.create({
    data: {
      userId: req.userId!,
      teamName,
      officialEmail,
      message,
    },
  })
  res.status(201).json(request)
})

// 📚 Autenticación y autorización se componen: solo el SUPER_ADMIN accede a la cola.
//    El select anidado evita devolver el hash de contraseña del usuario relacionado.
router.get("/solicitudes", authMiddleware, requireSuperAdmin, async (_req, res) => {
  const requests = await prisma.teamRequest.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, email: true } } },
  })
  res.json(requests)
})

router.get("/mis-equipos", authMiddleware, async (req, res) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: req.userId },
    include: { team: { select: { slug: true, nombre: true } } },
    orderBy: { joinedAt: "asc" },
  })
  res.json(memberships.map(({ role, team }) => ({ ...team, role })))
})

async function requireAdminTeam(slug: string, userId: number) {
  const team = await prisma.team.findUnique({ where: { slug } })
  if (!team) throw new AppError(404, "Equipo no encontrado")
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId: team.id } },
  })
  if (membership?.role !== "TEAM_ADMIN") {
    throw new AppError(403, "Solo un administrador puede gestionar invitaciones")
  }
  return team
}

// 📚 El token se descifra solo después de autorizar al administrador del tenant. Las
//    invitaciones antiguas conservan token=null porque un hash no permite recuperar el original.
router.get("/:slug/invitaciones", authMiddleware, async (req, res) => {
  const team = await requireAdminTeam(String(req.params.slug), req.userId!)
  const invitations = await prisma.teamInvitation.findMany({
    where: { teamId: team.id },
    orderBy: { createdAt: "desc" },
  })
  res.json(invitations.map((invitation) => ({
    id: invitation.id,
    token: invitation.tokenCiphertext ? decryptInvitationToken(invitation.tokenCiphertext) : null,
    expiresAt: invitation.expiresAt,
    revokedAt: invitation.revokedAt,
    maxUses: invitation.maxUses,
    uses: invitation.uses,
    createdAt: invitation.createdAt,
  })))
})

// 📚 La invitación se guarda como hash y el token plano solo se devuelve en esta respuesta;
//    así el enlace puede compartirse, pero una filtración de la tabla no lo hace reutilizable.
router.post("/:slug/invitaciones", authMiddleware, async (req, res) => {
  const slug = String(req.params.slug)
  const { expiresInDays = 7, maxUses = 1 } = req.body as { expiresInDays?: number; maxUses?: number }
  const team = await requireAdminTeam(slug, req.userId!)
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30 || !Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
    throw new AppError(400, "expiresInDays (1-30) y maxUses (1-100) no son válidos")
  }
  const token = crypto.randomBytes(24).toString("base64url")
  const invitation = await prisma.teamInvitation.create({
    data: {
      teamId: team.id,
      createdById: req.userId!,
      tokenHash: hashInvitationToken(token),
      tokenCiphertext: encryptInvitationToken(token),
      expiresAt: new Date(Date.now() + expiresInDays * 86400000),
      maxUses,
    },
  })
  res.status(201).json({ token, team: { slug: team.slug, nombre: team.nombre }, expiresAt: invitation.expiresAt, maxUses })
})

export default router
