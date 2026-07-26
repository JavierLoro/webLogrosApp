// 📚 MÓDULO DE CONFIGURACIÓN (fail-fast). Centraliza la lectura y validación de las
//    variables de entorno. El resto del código importa de aquí en vez de tocar
//    process.env con "!", para que una config incompleta se detecte AL ARRANCAR y no
//    dentro de una petición (ver docs/apuntes.md → "Hardening").

// 📚 dotenv como PRIMERA línea: rellena process.env desde .env ANTES de leer nada.
//    Si se leyera process.env antes de esto, las variables estarían vacías → falso
//    positivo del fail-fast. Por eso también server.ts importa este módulo el primero.
import "dotenv/config";

// 📚 Devuelve el valor validado tipado como `string` (no `string | undefined`).
//    Combina comprobación + retorno en una función para poder borrar los "!" del resto.
function requerida(nombre: string): string {
    const value = process.env[nombre];
    if (!value) {
        // 📚 Falla ruidoso y claro: nombra la variable que falta y corta el arranque.
        console.error(`Environment variable ${nombre} is not defined.`);
        // 📚 exit(1): código ≠ 0 = error. Docker/orquestadores lo leen y saben que el
        //    contenedor arrancó mal (no lo marcan sano, disparan reinicio). exit(0) = éxito.
        process.exit(1);
    }
    // 📚 process.exit(1) es tipo `never` → TS estrecha (narrowing) `value` a string aquí,
    //    porque si se llegó a esta línea es imposible haber pasado por el if. Por eso
    //    el return compila sin "!". (Un bucle for NO consigue este narrowing; una función sí.)
    return value;
}

// 📚 Valores ya validados y tipados como string. Al importarse el módulo, estas líneas
//    se ejecutan → si falta alguna, el proceso muere aquí mismo.
export const DATABASE_URL = requerida("DATABASE_URL")
export const JWT_SECRET = requerida("JWT_SECRET")
