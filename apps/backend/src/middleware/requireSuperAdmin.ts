import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"

// 📚 Autorización global: authMiddleware identifica al usuario y este segundo middleware
//    consulta la BD para que un permiso retirado tenga efecto sin esperar a que caduque el JWT.
export async function requireSuperAdmin(req: Request, _res: Response, next: NextFunction) {
    if (!req.userId) throw new AppError(401, "Sesión requerida")
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { isSuperAdmin: true },
    })
    // 📚 403: la identidad es válida, pero no tiene autorización para esta operación.
    if (!user || !user.isSuperAdmin) {
        throw new AppError(403, "Acceso denegado: se requiere un superadministrador")
    }
    next()
}
