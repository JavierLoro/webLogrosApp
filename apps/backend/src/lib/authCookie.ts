import { Request, Response } from "express"

const AUTH_COOKIE = "weblogros_session"
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// 📚 HttpOnly impide que JavaScript lea el JWT; SameSite=Lax evita enviarlo en POST
//    iniciados desde otro sitio y Secure lo limita a HTTPS cuando NODE_ENV=production.
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SEVEN_DAYS_MS })
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE, cookieOptions)
}

export function getAuthToken(req: Request) {
  // 📚 Solo necesitamos una cookie: parsearla aquí evita añadir cookie-parser y mantiene
  //    la credencial en un punto compartido. JWT usa base64url, por lo que no contiene `;`.
  return req.headers.cookie
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE}=`))
    ?.slice(AUTH_COOKIE.length + 1)
}
