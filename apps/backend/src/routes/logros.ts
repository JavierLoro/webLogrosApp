import express, { Request, Response } from "express"
import prisma from "../lib/prisma"
import { authMiddleware } from "../middleware/auth"

const router = express.Router()

router.get("/", async (_req: Request, res: Response) => {
  const logros = await prisma.logro.findMany()
  res.json(logros)
})

router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id)
  const logro = await prisma.logro.findUnique({ where: { id } })

  if (!logro) {
    res.status(404).json({ error: "Logro no encontrado" })
    return
  }

  res.json(logro)
})

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  const { nombre, puntos, descripcion, categoria, icono }: { nombre: string; puntos: number; descripcion: string; categoria: string; icono: string } = req.body ?? {}

  if (!nombre || !puntos || !descripcion || !categoria || !icono) {
    res.status(400).json({ error: "Faltan campos: nombre, puntos, descripcion, categoria o icono" })
    return
  }

  const nuevoLogro = await prisma.logro.create({
    data: { nombre, puntos, descripcion, categoria, icono },
  })

  res.status(201).json(nuevoLogro)
})

export default router
