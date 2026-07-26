// 📚 CLIENTE PRISMA SINGLETON. Se crea UNA sola instancia y se exporta, para que toda la
//    app comparta el mismo pool de conexiones. Si cada archivo hiciera `new PrismaClient()`
//    se abrirían conexiones de más y se agotaría la BD.
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
// 📚 DATABASE_URL viene del módulo config/env ya validado (fail-fast), no de process.env
//    directo con "!". Importarlo aquí también garantiza que dotenv ya cargó.
import { DATABASE_URL } from "../config/env"

// 📚 adapter pg: Prisma 7 usa un "driver adapter" — habla con Postgres a través de la
//    librería `pg` en vez del motor binario clásico.
const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// 📚 export default: esta instancia única es la interfaz pública del módulo.
export default prisma
