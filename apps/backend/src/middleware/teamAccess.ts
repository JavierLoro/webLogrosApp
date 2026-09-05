import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"

// 📚 La autorización multi-tenant se separa de la autenticación: JWT responde «quién eres»;
//    esta consulta responde «qué puedes hacer dentro de este equipo concreto».
async function resolveMembership(req: Request) {
  if (!req.userId || !req.team) throw new AppError(401, "Sesión y equipo requeridos")
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId: req.userId, teamId: req.team.id } },
  })
  if (!membership) throw new AppError(403, "No perteneces a este equipo")
  return membership
}

export async function requireTeamMember(req: Request, _res: Response, next: NextFunction) {
  // 📚 Guardamos la membresía en req para que los handlers no repitan la misma consulta y
  //    para que el middleware siguiente pueda comprobar el rol contextual.
  req.teamMembership = await resolveMembership(req)
  next()
}

export async function requireTeamAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    req.teamMembership = await resolveMembership(req)
    if (req.teamMembership?.role !== "TEAM_ADMIN") {
      next(new AppError(403, "Solo un administrador puede modificar este equipo"))
      return
    }
    next()
  } catch (error) {
    next(error)
  }
}
