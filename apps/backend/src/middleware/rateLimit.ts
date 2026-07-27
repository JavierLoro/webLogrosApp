// 📚 RATE LIMITING: defensa en profundidad contra abuso por IP. rateLimit es una FACTORÍA:
//    la llamas con una config y te devuelve un middleware (req,res,next) que cuenta peticiones
//    por IP en una ventana de tiempo y corta con 429 al superar el máximo. Mismo patrón
//    factoría/closure que validate(schema): la config queda "recordada" dentro del middleware.
//    Cada llamada a rateLimit() crea una instancia con su PROPIO contador → por eso login y
//    register llevan limiters separados (cuentas independientes, límites a medida).
import { rateLimit } from "express-rate-limit"


// 📚 loginLimiter: protege /auth/login de fuerza bruta de contraseñas. Estricto (5/15min)
//    porque el login es el objetivo clásico de credential-stuffing. Va PRIMERO en la cadena,
//    antes de validate y del handler: descarta al atacante en el filtro más barato, sin gastar
//    Zod ni bcrypt (que es lento a propósito).
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Limita cada IP a 5 solicitudes de inicio de sesión por ventana (por ejemplo, por 15 minutos)
  message: {error: "Demasiados intentos de inicio de sesión desde esta IP, por favor inténtelo de nuevo después de 15 minutos"},
  standardHeaders: true, // Devuelve información de limitación en los encabezados `RateLimit-*`
  legacyHeaders: false, // Desactiva los encabezados `X-RateLimit-*`
})

// 📚 registerLimiter: el abuso del registro NO es fuerza bruta, es creación masiva de cuentas
//    (spam de usuarios / saturar la BD). Por eso su config es distinta: más laxa (10/hora),
//    porque registrarse es una acción legítima poco frecuente. Instancia y contador propios.
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // Limita cada IP a 10 solicitudes de registro por ventana (por ejemplo, por hora)
    message: {error: "Demasiados intentos de registro desde esta IP, por favor inténtelo de nuevo después de 1 hora"},
    standardHeaders: true, // Devuelve información de limitación en los encabezados `RateLimit-*`
    legacyHeaders: false, // Desactiva los encabezados `X-RateLimit-*`
})