import express, { Request, Response } from "express"
// 📚 bcryptjs: hashing de contraseñas. NUNCA se guarda la contraseña en claro.
import bcrypt from "bcryptjs"
// 📚 jsonwebtoken: crea y verifica JWT (el "carnet" firmado que prueba la sesión).
import jwt from "jsonwebtoken"
import prisma from "../lib/prisma"
import { JWT_SECRET } from "../config/env"
import { validate } from "../middleware/validate"
import { registerSchema, loginSchema } from "../schemas/auth"


// 📚 Router de Express: mini-app con sus rutas, que server.ts monta bajo el prefijo /auth.
const router = express.Router()
const SECRET = JWT_SECRET

// POST /auth/register — crear cuenta
// 📚 validate(registerSchema) va ANTES del handler: valida req.body contra el esquema y, si
//    falla, lanza AppError(400) → nunca se ejecuta el handler. Sustituye al if manual de
//    presencia por validación de FORMA. Al pasar, req.body ya viene limpio y tipado.
router.post("/register", validate(registerSchema), async (req: Request, res: Response) => {
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
// 📚 validate(loginSchema): mismo patrón que register, con el esquema laxo de login.
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body ?? {}

  const user = await prisma.user.findUnique({ where: { email } })
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

  // 📚 jwt.sign firma un token con el userId dentro y caducidad 7d. El cliente lo guardará
  //    y lo mandará en "Authorization: Bearer" → authMiddleware lo verificará.
  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" })
  res.json({ token })
})



export default router
