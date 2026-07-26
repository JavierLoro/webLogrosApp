import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
// 📚 JWT_SECRET validado en config/env (fail-fast), no process.env["JWT_SECRET"]!
import { JWT_SECRET } from "../config/env"

const SECRET = JWT_SECRET

// 📚 MIDDLEWARE DE AUTENTICACIÓN. Se coloca DELANTE de las rutas que requieren sesión.
//    Un middleware Express recibe (req, res, next): puede cortar la petición (res.status...)
//    o dejarla pasar llamando a next(). Aquí: verifica el JWT y, si es válido, inyecta
//    el userId en req para que la ruta sepa quién es el usuario.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 📚 Convención "Authorization: Bearer <token>". split(" ")[1] toma la parte del token.
  const header = req.headers["authorization"]  // "Bearer <token>"
  const token = header?.split(" ")[1]

  if (!token) {
    // 📚 401 Unauthorized: falta credencial. return corta el middleware sin llamar next().
    res.status(401).json({ error: "Token requerido" })
    return
  }

  try {
    // 📚 jwt.verify comprueba la firma con SECRET. Si el token fue manipulado o expiró,
    //    LANZA → caemos al catch. El "as { userId }" tipa el payload que nosotros firmamos.
    const payload = jwt.verify(token, SECRET) as { userId: number }
    // 📚 Inyectamos userId en req para las rutas siguientes. El "as any" es un parche:
    //    Express no conoce userId en su tipo Request (mejora futura: extender el tipo).
    ;(req as any).userId = payload.userId
    // 📚 next(): todo OK, pasa el control a la siguiente función (la ruta protegida).
    next()
  } catch {
    res.status(401).json({ error: "Token inválido" })
  }
}
