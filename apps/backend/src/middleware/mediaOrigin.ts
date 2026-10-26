import type { RequestHandler } from "express"
import { AppError } from "../errors/AppError"
import { mediaAllowedOriginsFromProcess } from "../config/mediaEnv"

// 📚 Las cookies acreditan identidad y Origin impide que otra web provoque escrituras con esa sesión.
export function assertAllowedOrigin(originHeader: string | undefined, allowedOrigins: readonly string[]): void {
  if (!originHeader) throw new AppError(403, "Origen no permitido")
  try {
    const parsed = new URL(originHeader)
    if (parsed.origin !== originHeader || parsed.username || parsed.password || parsed.pathname !== "/" || !allowedOrigins.includes(parsed.origin)) throw new Error("ORIGIN")
  } catch { throw new AppError(403, "Origen no permitido") }
}
export const requireMediaOrigin: RequestHandler = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store")
  assertAllowedOrigin(req.get("origin"), mediaAllowedOriginsFromProcess())
  next()
}
