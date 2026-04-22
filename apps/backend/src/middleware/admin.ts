import { Request, Response, NextFunction } from "express"
import prisma from "../lib/prisma"

export default async function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.userId

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || user.role !== "ADMIN") {
        res.status(403).json({ error: "Sin permisos" })
        return
    }
    next()
}
