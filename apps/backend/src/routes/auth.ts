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
import { authMiddleware } from "../middleware/auth"
import { clearAuthCookie, setAuthCookie } from "../lib/authCookie"


// 📚 Router de Express: mini-app con sus rutas, que server.ts monta bajo el prefijo /auth.
const router = express.Router()
const SECRET = JWT_SECRET

async function getSession(userId: number) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { memberships: { include: { team: { select: { slug: true, nombre: true } } }, orderBy: { joinedAt: "asc" } } },
  })
  return {
    teams: user.memberships.map(({ role, team }) => ({ slug: team.slug, nombre: team.nombre, role })),
    isSuperAdmin: user.isSuperAdmin,
  }
}

// POST /auth/register — crear cuenta
// 📚 CADENA: registerLimiter → validate(registerSchema) → handler. El limiter va PRIMERO
//    (filtro más barato: solo mira IP + contador) para no gastar Zod/bcrypt en abuso.
// 📚 validate(registerSchema) va ANTES del handler: valida req.body contra el esquema y, si
//    falla, lanza AppError(400) → nunca se ejecuta el handler. Sustituye al if manual de
//    presencia por validación de FORMA. Al pasar, req.body ya viene limpio y tipado.
router.post("/register", registerLimiter, validate(registerSchema), async (req: Request, res: Response) => {
  // 📚 Aquí email/password YA están garantizados por validate (existen y bien formados).
  const { email, password }: { email: string; password: string } = req.body ?? {}

  // 📚 email es @unique en el schema: comprobamos antes para dar un error claro.
  const existe = await prisma.user.findUnique({ where: { email } })
  if (existe) {
    res.status(400).json({ error: "El email ya está registrado" })
    return
  }

  // 📚 hash con "salt rounds" = 10: bcrypt genera un hash lento y salado. Guardamos el
  //    hash, nunca la contraseña. Comparar más tarde se hace con bcrypt.compare.
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hash } })

  // 📚 201 Created. Devolvemos id y email, NUNCA el hash de la contraseña.
  res.status(201).json({ id: user.id, email: user.email })
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

  // 📚 jwt.sign crea la credencial, pero setAuthCookie la entrega como HttpOnly: el navegador
  //    la enviará automáticamente y JavaScript nunca recibe el token.
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" })
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

// 📚 La sesión se reconstruye desde el JWT verificado y los roles actuales de la BD;
//    así la interfaz no depende de información persistida por JavaScript ni de roles obsoletos.
router.get("/session", authMiddleware, async (req, res) => {
  res.json(await getSession(req.userId!))
})

// 📚 Un JWT no se revoca en BD en esta fase: logout elimina la cookie del navegador usando
//    las mismas opciones con las que fue creada para que el borrado sea efectivo.
router.post("/logout", (_req, res) => {
  clearAuthCookie(res)
  res.status(204).send()
})



export default router
