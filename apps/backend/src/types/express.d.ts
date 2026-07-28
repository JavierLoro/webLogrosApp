import { Team } from "@prisma/client"

// 📚 declare global + namespace Express: reabrimos la interfaz Request de Express y le
//    AÑADIMOS nuestras propiedades. Así req.userId y req.team quedan tipados en TODA la app
//    y desaparece el parche (req as any). Es "declaration merging": sumar campos a un tipo ajeno.
declare global {
  namespace Express {
    interface Request {
      userId?: number
      team?: Team
    }
  }
}