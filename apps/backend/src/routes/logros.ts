import express, { Request, Response } from "express"
import prisma from "../lib/prisma"
import { authMiddleware } from "../middleware/auth"
import { validate } from "../middleware/validate"
import { crearLogroSchema } from "../schemas/logros"

// 📚 RUTAS DEL RECURSO "logros". Diseño REST: la MISMA URL (/logros) hace cosas distintas
//    según el método HTTP. Lectura pública, escritura protegida.
const router = express.Router()

// 📚 GET / (lectura) es PÚBLICO: cualquiera ve la lista, sin authMiddleware.
//    _req con guion bajo = parámetro no usado (tsconfig avisa de los que no se usan).
router.get("/", async (_req: Request, res: Response) => {
  const logros = await prisma.logro.findMany()
  res.json(logros)
})

router.get("/:id", async (req: Request, res: Response) => {
  // 📚 Los params de la URL llegan como string → Number() lo convierte a int para la BD.
  const id = Number(req.params.id)
  const logro = await prisma.logro.findUnique({ where: { id } })

  if (!logro) {
    // 📚 404 Not Found: el recurso pedido no existe.
    res.status(404).json({ error: "Logro no encontrado" })
    return
  }

  res.json(logro)
})

// 📚 POST / (escritura): CADENA de middlewares en orden → authMiddleware → validate → handler.
//    1) authMiddleware: sin token válido corta con 401 (no gastamos esfuerzo en validar el
//       cuerpo de alguien no autenticado). 2) validate(crearLogroSchema): valida el body, 400
//       si falla. 3) handler: solo se ejecuta si ambos pasaron. El ORDEN es intencionado.
router.post("/", authMiddleware, validate(crearLogroSchema), async (req: Request, res: Response) => {
  const { nombre, puntos }: { nombre: string; puntos: number } = req.body ?? {}

  const nuevoLogro = await prisma.logro.create({
    data: { nombre, puntos }
  })

  res.status(201).json(nuevoLogro)
})

export default router
