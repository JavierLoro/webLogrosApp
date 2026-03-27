import express, { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import prisma from "../lib/prisma"

const router = express.Router()
const SECRET = process.env["JWT_SECRET"]!

// POST /auth/register — crear cuenta
router.post("/register", async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body ?? {}

  if (!email || !password) {
    res.status(400).json({ error: "Faltan campos: email y password" })
    return
  }

  const existe = await prisma.user.findUnique({ where: { email } })
  if (existe) {
    res.status(400).json({ error: "El email ya está registrado" })
    return
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, password: hash } })

  res.status(201).json({ id: user.id, email: user.email })
})

// POST /auth/login — iniciar sesión
router.post("/login", async (req: Request, res: Response) => {
  const { email, password }: { email: string; password: string } = req.body ?? {}

  if (!email || !password) {
    res.status(400).json({ error: "Faltan campos: email y password" })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    res.status(401).json({ error: "Credenciales incorrectas" })
    return
  }

  const esValido = await bcrypt.compare(password, user.password)
  if (!esValido) {
    res.status(401).json({ error: "Credenciales incorrectas" })
    return
  }

  const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" })
  res.json({ token })
})

export default router
