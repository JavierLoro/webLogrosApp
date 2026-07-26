// 📚 CLASE DE ERROR PROPIA. Separa el "qué" (hubo un error 404) del "cómo se responde".
//    En las rutas escribimos `throw new AppError(404, "...")` en vez de repetir
//    res.status(404).json(...) por todas partes; el error handler global decide el formato.

// 📚 extends Error: reutilizamos el error nativo (trae .message, .stack y lo detecta
//    try/catch e instanceof) y SOLO le añadimos statusCode. No reinventamos qué es un error.
export class AppError extends Error {
    // 📚 parameter property: poner "public" delante del parámetro declara el campo,
    //    lo crea en el objeto y le asigna el valor, todo en un gesto (azúcar de TS).
    constructor(public statusCode: number, message: string) {
        // 📚 super(message) llama al constructor del padre (Error) → sin esto, .message y
        //    .stack no se inicializarían. Debe ir antes de usar `this`.
        super(message);
    }
}
