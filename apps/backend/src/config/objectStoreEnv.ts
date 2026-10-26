// 📚 dotenv/config carga .env en process.env antes de que leamos las variables.
// 📚 Node --env-file puede cargar además los archivos locales indicados al arrancar.
import "dotenv/config"

// 📚 El tipo describe una configuración ya validada: el adaptador recibe strings
// 📚 y un boolean, en vez de repetir comprobaciones de undefined en cada operación.
export type ObjectStoreConfig = {
  endpoint: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

// 📚 Configuración diferida: S3 se valida al crear el adaptador. Las rutas actuales
// 📚 pueden arrancar sin media mientras la integración de imágenes sigue pendiente.
export function objectStoreConfigFromEnv(): ObjectStoreConfig {
  // 📚 process.env devuelve string | undefined. Este helper exige un valor no vacío
  // 📚 y permite que TypeScript trate el resultado como string a partir de aquí.
  const required = (name: string): string => {
    // 📚 ?. evita llamar trim() sobre undefined; trim() descarta espacios accidentales.
    const value = process.env[name]?.trim()
    // 📚 No incluimos el valor en el error: una credencial podría ser secreta.
    if (!value) throw new Error(`Falta la variable de entorno ${name} para el almacenamiento de objetos`)
    return value
  }

  const endpoint = required("S3_ENDPOINT")
  // 📚 URL analiza el endpoint como dirección, no como una cadena arbitraria.
  // 📚 SeaweedFS usa HTTP local; el destino externo podrá usar HTTPS.
  const url = new URL(endpoint)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("S3_ENDPOINT debe utilizar http o https")
  }

  // 📚 Las variables de entorno son texto: incluso "false" sería truthy en un if.
  // 📚 Por eso aceptamos solo "true"/"false" y convertimos al boolean al final.
  const pathStyle = process.env.S3_FORCE_PATH_STYLE ?? "true"
  if (pathStyle !== "true" && pathStyle !== "false") {
    throw new Error("S3_FORCE_PATH_STYLE debe ser true o false")
  }

  return {
    endpoint: url.toString(),
    // 📚 || aplica el valor local si S3_REGION falta o contiene solo espacios;
    // 📚 ??, usado arriba, aplica el valor por defecto solo si falta la variable.
    region: process.env.S3_REGION?.trim() || "us-east-1",
    bucket: required("S3_BUCKET"),
    // 📚 El bucket identifica dónde se guardan objetos; las claves autentican al
    // 📚 backend ante el almacén. Ninguno de estos valores se envía al navegador.
    accessKeyId: required("AWS_ACCESS_KEY_ID"),
    secretAccessKey: required("AWS_SECRET_ACCESS_KEY"),
    // 📚 Path-style local: el bucket viaja en la ruta del endpoint de SeaweedFS.
    forcePathStyle: pathStyle === "true",
  }
}
