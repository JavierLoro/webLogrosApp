import { Request, Response, NextFunction } from "express"
import { AppError } from "../errors/AppError"

// 📚 ERROR HANDLER GLOBAL. Un único sitio donde se decide el formato de TODAS las respuestas
//    de error. Se monta el último en server.ts (app.use(errorHandler)), tras las rutas.
// 📚 Firma de 4 argumentos (err, req, res, next): así Express lo reconoce como manejador de
//    errores y solo lo invoca cuando algo lanzó. En Express 5, los throw de rutas async se
//    reenvían aquí automáticamente (en Express 4 había que llamar next(err) a mano).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    // 📚 Una respuesta de imagen puede haber empezado antes de fallar el stream;
    // 📚 Express debe cerrarla, no intentar escribir un segundo cuerpo JSON.
    if (res.headersSent || res.destroyed) {
        _next(err)
        return
    }
    // 📚 Un handler puede haber preparado cabeceras de imagen sin enviar bytes:
    // 📚 el JSON de error necesita su propio tipo, longitud y validador.
    res.removeHeader("Content-Type")
    res.removeHeader("Content-Length")
    res.removeHeader("ETag")
    // 📚 Ningún error de sesión, permisos o almacenamiento debe quedar reutilizable
    // 📚 por una caché que antes hubiera visto una imagen con el mismo URL.
    res.setHeader("Cache-Control", "no-store")
    // 📚 err es `unknown`, no `any`: en JS se puede lanzar cualquier cosa (string, número...),
    //    así que TS nos OBLIGA a comprobar antes de tocar .statusCode. Mueve el error a
    //    tiempo de compilación en vez de runtime.
    if (err instanceof AppError) {
        // 📚 Error ESPERADO (lo lanzamos nosotros): dentro del if, TS ya sabe que es AppError
        //    (narrowing) → su statusCode y message son seguros de mostrar al cliente.
        res.status(err.statusCode).json({ error: err.message })
    } else {
        // 📚 Error INESPERADO (bug, Prisma...): logueamos el error REAL en el servidor (para
        //    depurar) pero al cliente solo un 500 genérico → no filtramos stack ni internals.
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
}
