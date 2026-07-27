// 📚 PUNTO DE ENTRADA del backend. El orden de las líneas importa mucho aquí.

// 📚 PRIMERA línea a propósito: importar config/env dispara la validación fail-fast
//    (y carga dotenv) ANTES que nada. Si falta una variable, el proceso muere aquí,
//    antes de montar rutas o escuchar. Explícito = a prueba de refactors.
import "./config/env"
import express from "express"
import logrosRouter from "./routes/logros"
import authRouter from "./routes/auth"
import { errorHandler } from "./middleware/errorHandler"
import prisma from "./lib/prisma"

const app = express()
// 📚 trust proxy = 1: detrás de nginx TODAS las peticiones llegan con la IP interna del proxy.
//    Esto le dice a Express que confíe en 1 salto de proxy y lea la IP real del cliente desde
//    la cabecera X-Forwarded-For. Sin esto, el rate limiter contaría a todo el mundo como una
//    sola IP (bloquearía a usuarios legítimos) y express-rate-limit avisa del riesgo al arrancar.
//    Se pone 1 y no `true`: con `true` confiaríamos en CUALQUIER X-Forwarded-For y un atacante
//    podría falsear su IP para saltarse el límite.
app.set("trust proxy", 1)
const PORT: number = 3001



// 📚 CORS MANUAL (sin librería). El navegador bloquea peticiones entre orígenes distintos
//    salvo que el servidor devuelva estas cabeceras. Permite al frontend (:3000) llamar al
//    backend (:3001) en desarrollo. En producción, nginx sirve todo bajo el mismo origen y
//    esto deja de ser necesario.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
  // 📚 Preflight: antes de un POST con JSON/Authorization, el navegador manda un OPTIONS
  //    "de sondeo". Respondemos 200 sin pasar a las rutas.
  if (req.method === "OPTIONS") {
    res.sendStatus(200)
    return
  }
  next()
})
// 📚 express.json(): middleware que parsea el body JSON y lo deja en req.body. Sin esto,
//    req.body sería undefined. Va antes de las rutas que lo necesitan.
app.use(express.json())

app.get("/health", async(_req, res) => {
  try {
    // 📚 Prisma hace ping a la BD para comprobar que está viva. Si falla, lanzará error.
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: "ok" })
  } catch (error) {
    console.error("Error de salud:", error)
    res.status(503).json({ status: "error", message: "Error de salud del servidor" })
  }
})

app.get("/", (_req, res) => {
  res.send("Servidor funcionando")
})

// 📚 Montaje de routers bajo su prefijo: todo lo de authRouter cuelga de /auth, etc.
//    El ORDEN de los app.use define la cadena de middlewares que atraviesa cada petición.
app.use("/auth", authRouter)
app.use("/logros", logrosRouter)

// 📚 EL ÚLTIMO de la cadena: la "red" que captura los errores lanzados en las rutas de
//    arriba. Si se pusiera antes, esas rutas aún no existirían en la cadena y sus errores
//    no llegarían aquí. En Express 5 los throw async de las rutas se reenvían solos.
app.use(errorHandler)

// 📚 app.listen arranca el servidor HTTP. El callback confirma en el log que está escuchando.
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})


