import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const SECRET = process.env["JWT_SECRET"]!

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"]  // "Bearer <token>"
  const token = header?.split(" ")[1]

  if (!token) {
    res.status(401).json({ error: "Token requerido" })
    return
  }

  try {
    const payload = jwt.verify(token, SECRET) as { userId: number }
    ;(req as any).userId = payload.userId
    next()
  } catch {
    res.status(401).json({ error: "Token inválido" })
  }
}
