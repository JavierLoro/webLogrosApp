import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"
import { AppError } from "../errors/AppError"

// 📚 MIDDLEWARE DE SCOPING MULTI-TENANT. Traduce el :slug de la URL a un equipo real y lo deja
//    en req.team, igual que authMiddleware deja req.userId. Centraliza el "busca el equipo o 404"
//    para que NINGÚN handler de /equipos/:slug/... lo repita (composición de middlewares).
// 📚 Request<{ slug: string }>: el genérico tipa req.params. Sin él, params vale string | string[]
//    (Express no sabe qué params tiene la ruta); así slug es string y Prisma lo acepta.
export async function resolveTeam(req: Request<{ slug: string }>, _res: Response, next: NextFunction) {
    const { slug } = req.params
    // 📚 async → consulta a la BD. En Express 5, si esto lanza (throw), el error se reenvía solo
    //    al errorHandler global (no hace falta try/catch ni next(err)).
    const team = await prisma.team.findUnique({ where: { slug } })
    if (!team) {
        // 📚 404 vía AppError: reutiliza el error handler central (mismo patrón que validate).
        throw new AppError(404, "Team not found")
    }
    // 📚 Inyecta el equipo resuelto en req (tipado por el .d.ts). Los handlers ya lo reciben hecho.
    req.team = team
    next()
}