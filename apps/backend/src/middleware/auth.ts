import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
// 📚 JWT_SECRET validado en config/env (fail-fast), no process.env["JWT_SECRET"]!
import { JWT_SECRET } from "../config/env"
import { getAuthToken } from "../lib/authCookie"

const SECRET = JWT_SECRET

// 📚 MIDDLEWARE DE AUTENTICACIÓN. Se coloca DELANTE de las rutas que requieren sesión.
//    Un middleware Express recibe (req, res, next): puede cortar la petición (res.status...)
//    o dejarla pasar llamando a next(). Aquí: verifica el JWT y, si es válido, inyecta
//    el userId en req para que la ruta sepa quién es el usuario.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 📚 La cookie HttpOnly llega automáticamente en el header Cookie. El frontend no puede
  //    leerla ni construir una credencial manual, reduciendo el impacto de un XSS.
  const token = getAuthToken(req)

  if (!token) {
    // 📚 401 Unauthorized: falta credencial. return corta el middleware sin llamar next().
    res.status(401).json({ error: "Sesión requerida" })
    return
  }

  try {
    // 📚 jwt.verify comprueba la firma con SECRET. Si el token fue manipulado o expiró,
    //    LANZA → caemos al catch. El "as { userId }" tipa el payload que nosotros firmamos.
    const payload = jwt.verify(token, SECRET) as { userId: number }
    // 📚 Inyectamos userId en req para las rutas siguientes.
    req.userId = payload.userId
    // 📚 next(): todo OK, pasa el control a la siguiente función (la ruta protegida).
    next()
  } catch {
    res.status(401).json({ error: "Token inválido" })
  }
}
