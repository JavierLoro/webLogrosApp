import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
// 📚 JWT_SECRET validado en config/env (fail-fast), no process.env["JWT_SECRET"]!
import { JWT_SECRET } from "../config/env"
import { AUTH_COOKIE } from "../lib/authCookie"

const SECRET = JWT_SECRET

// 📚 MIDDLEWARE DE AUTENTICACIÓN. Se coloca DELANTE de las rutas que requieren sesión.
//    Un middleware Express recibe (req, res, next): puede cortar la petición (res.status...)
//    o dejarla pasar llamando a next(). Aquí: verifica el JWT y, si es válido, inyecta
//    el userId en req para que la ruta sepa quién es el usuario.
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 📚 cookieParser ya convirtió la cabecera Cookie en req.cookies. Reutilizar
  // 📚 AUTH_COOKIE evita que login y autenticación discrepen sobre el nombre.
  const token = req.cookies?.[AUTH_COOKIE]

  // 📚 Las cookies son entrada externa: narrowing con typeof garantiza que jwt.verify
  // 📚 reciba un string y rechaza tanto la ausencia como cualquier forma inesperada.
  if (typeof token !== "string") {
    // 📚 401 Unauthorized: falta credencial. return corta el middleware sin llamar next().
    res.status(401).json({ error: "Token requerido" })
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
