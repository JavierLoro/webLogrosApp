import "dotenv/config"
import express from "express"
import logrosRouter from "./routes/logros"
import authRouter from "./routes/auth"

const app = express()
const PORT: number = 3001

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.sendStatus(200)
    return
  }
  next()
})
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Servidor funcionando")
})

app.use("/auth", authRouter)
app.use("/logros", logrosRouter)

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`)
})