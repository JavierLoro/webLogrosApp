import express, { Request, Response } from "express"
// 📚 bcryptjs: hashing de contraseñas. NUNCA se guarda la contraseña en claro.
import bcrypt from "bcryptjs"
// 📚 jsonwebtoken: crea y verifica JWT (el "carnet" firmado que prueba la sesión).
import jwt from "jsonwebtoken"
import prisma from "../lib/prisma"
import { JWT_SECRET } from "../config/env"
import { validate } from "../middleware/validate"
import { registerSchema, loginSchema } from "../schemas/auth"
import { registerLimiter, loginLimiter } from "../middleware/rateLimit"
import { clearAuthCookie, setAuthCookie } from "../lib/authCookie"
import { authMiddleware } from "../middleware/auth"


// 📚 Router de Express: mini-app con sus rutas, que server.ts monta bajo el prefijo /auth.
const router = express.Router()
const SECRET = JWT_SECRET

// POST /auth/register — crear cuenta
// 📚 CADENA: registerLimiter → validate(registerSchema) → handler. El limiter va PRIMERO
//    (filtro más barato: solo mira IP + contador) para no gastar Zod/bcrypt en abuso.
// 📚 validate(registerSchema) va ANTES del handler: valida req.body contra el esquema y, si
//    falla, lanza AppError(400) → nunca se ejecuta el handler. Sustituye al if manual de
//    presencia por validación de FORMA. Al pasar, req.body ya viene limpio y tipado.
router.post("/register", registerLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  // 📚 Aquí los cuatro campos YA están garantizados y normalizados por validate.
  const { email, password, firstName, lastName }: { email: string; password: string; firstName: string; lastName: string } = req.body ?? {}

  // 📚 email es @unique en el schema: comprobamos antes para dar un error claro.
  const existe = await prisma.user.findUnique({ where: { email } })
  if (existe) {
    res.status(400).json({ error: "El email ya está registrado" })
    return
  }

  // 📚 hash con "salt rounds" = 10: bcrypt genera un hash lento y salado. Guardamos el
  //    hash, nunca la contraseña. Comparar más tarde se hace con bcrypt.compare.
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hash, firstName, lastName } })

  // 📚 201 Created. Devolvemos id y email, NUNCA el hash de la contraseña.
  res.status(201).json({ id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName })
})

// POST /auth/login — iniciar sesión
// 📚 loginLimiter (5/15min, estricto) primero: es el objetivo típico de fuerza bruta.
// 📚 validate(loginSchema): mismo patrón que register, con el esquema laxo de login.
router.post("/login", loginLimiter, validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body ?? {}

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { team: { select: { slug: true, nombre: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  })
  if (!user) {
    // 📚 401 y mensaje genérico "Credenciales incorrectas": no revelamos si falló el email
    //    o la contraseña (no dar pistas a un atacante sobre qué emails existen).
    res.status(401).json({ error: "Credenciales incorrectas" })
    return
  }

  // 📚 bcrypt.compare re-hashea la contraseña recibida con el mismo salt y compara. No se
  //    puede "des-hashear" el guardado; solo comparar.
  const esValido = await bcrypt.compare(password, user.password)
  if (!esValido) {
    res.status(401).json({ error: "Credenciales incorrectas" })
    return
  }


  // 📚 jwt.sign crea la credencial de sesión, pero ya no la exponemos en el JSON:
  // 📚 una cookie HttpOnly permite que el navegador la transporte sin que JavaScript la lea.
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" })
  // 📚 Debe ejecutarse antes de res.json(): res.cookie añade la cabecera Set-Cookie a
  // 📚 esta misma respuesta; después res.json envía el cuerpo y finaliza la petición.
  setAuthCookie(res, token)
  // 📚 El usuario puede tener 0, 1 o N membresías; devolvemos una colección para que el
  //    frontend pueda mostrar un selector sin convertir el dominio en un teamSlug singular.
  res.json({
    teams: user.memberships.map(({ role, team }) => ({ slug: team.slug, nombre: team.nombre, role })),
    // 📚 Este valor solo orienta la interfaz; nunca concede permisos. Los endpoints de
    //    SUPER_ADMIN volverán a comprobar el dato fiable en la BD mediante middleware.
    isSuperAdmin: user.isSuperAdmin,
  })
})

// 📚 authMiddleware es la barrera de esta ruta: valida la cookie antes del handler e
// 📚 inyecta req.userId. La BD aporta roles y membresías actuales, no datos congelados del JWT.
router.get("/session", authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    // 📚 Non-null assertion legítima: el handler solo se alcanza después de que
    // 📚 authMiddleware haya establecido userId o haya terminado con un 401.
    where: { id: req.userId! },
    include: {
      memberships: {
        include: { team: { select: { slug: true, nombre: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  })
  if (!user) {
    // 📚 Un JWT válido de un usuario ya eliminado tampoco representa una sesión vigente.
    res.status(401).json({ error: "Sesión no válida" })
    return
  }

  res.json({
    teams: user.memberships.map(({ role, team }) => ({ slug: team.slug, nombre: team.nombre, role })),
    isSuperAdmin: user.isSuperAdmin,
  })
})

// 📚 Logout es idempotente y no exige authMiddleware: incluso una cookie caducada,
// 📚 inválida o ausente debe poder recibir la instrucción de borrado sin responder 401.
router.post("/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res)
  // 📚 204 confirma la operación sin inventar un cuerpo JSON que el cliente no necesita.
  res.status(204).send()
})


export default router
