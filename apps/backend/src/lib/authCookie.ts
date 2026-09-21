import type { CookieOptions, Response } from "express"

export const AUTH_COOKIE = "auth_token"

export const timeToExpire = 1000 * 60 * 60 * 24 * 7 // 7 days

const authCookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
}

// 📚 Centralizamos la política de la cookie para que las rutas entreguen el JWT sin
// 📚 exponerlo a JavaScript ni repetir opciones de seguridad que podrían divergir.
export function setAuthCookie(res: Response, token: string): void {

    res.cookie(AUTH_COOKIE, token, {
        ...authCookieOptions,
        maxAge: timeToExpire
    })
}

function clearAuthCookie(res: Response): void {
    res.clearCookie(AUTH_COOKIE, authCookieOptions)
}