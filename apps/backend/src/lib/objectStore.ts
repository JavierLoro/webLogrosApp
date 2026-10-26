import { Readable } from "node:stream"
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { ObjectStoreConfig, objectStoreConfigFromEnv } from "../config/objectStoreEnv"

// 📚 HeadObject y GetObject pueden devolver estos datos junto al archivo.
// 📚 Son opcionales porque S3 no garantiza que todas las respuestas los incluyan.
export type StoredObjectInfo = {
  contentType?: string
  contentLength?: number
  etag?: string
}

// 📚 Readable es un flujo de Node: permite consumir los bytes por partes.
// 📚 El tipo & añade el cuerpo a los metadatos sin duplicar su definición.
export type StoredObject = StoredObjectInfo & { body: Readable }

// 📚 En un catch, TypeScript trata el error como unknown. Antes de consultar su
// 📚 código S3 comprobamos que sea un objeto; no asumimos que sea un Error común.
function isNotFound(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  // 📚 El SDK añade name y $metadata a sus errores; solo leemos esos campos.
  const s3Error = error as { name?: string; $metadata?: { httpStatusCode?: number } }
  // 📚 Un bucket inexistente es un problema de configuración, no una imagen ausente.
  if (s3Error.name === "NoSuchBucket") return false
  return s3Error.$metadata?.httpStatusCode === 404 || s3Error.name === "NoSuchKey"
}

// 📚 El adaptador oculta comandos S3 al resto del backend. Una futura migración a R2
// 📚 cambia configuración y pruebas de compatibilidad, no las rutas de la aplicación.
export class ObjectStore {
  // 📚 private evita que quien use ObjectStore manipule este cliente directamente.
  private readonly client: S3Client

  // 📚 private readonly config es una parameter property: el constructor guarda
  // 📚 automáticamente el argumento como campo de la clase para las operaciones.
  constructor(private readonly config: ObjectStoreConfig) {
    // 📚 Un cliente S3 representa la conexión lógica y firma cada petición con
    // 📚 estas credenciales. No se crea uno nuevo para cada objeto.
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle,
      // 📚 SeaweedFS y R2 no tienen por qué admitir checksums opcionales de AWS.
      // 📚 El SDK conserva los que una operación S3 exija obligatoriamente.
      requestChecksumCalculation: "WHEN_REQUIRED",
      // 📚 Un almacén caído no puede ocupar los dos puestos indefinidamente.
      // 📚 La petición tiene plazo y no reintenta automáticamente esta operación.
      maxAttempts: 1,
      requestHandler: {
        connectionTimeout: 5_000,
        requestTimeout: 30_000,
        throwOnRequestTimeout: true,
        socketTimeout: 30_000,
      },
    })
  }

  // 📚 PutObject guarda bajo una clave interna, no bajo una URL pública.
  // 📚 Por ahora recibe los bytes finales; la recepción/procesamiento va en otra capa.
  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    // 📚 send ejecuta el comando remoto; await deja que un fallo de S3 llegue al
    // 📚 llamador antes de considerar la imagen guardada.
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      // 📚 Declaramos el tamaño exacto de los bytes enviados para que S3 lo conozca.
      ContentLength: body.byteLength,
      // 📚 El llamador debe pasar el tipo validado de los bytes procesados.
      ContentType: contentType,
    }), { abortSignal: AbortSignal.timeout(30_000) })
  }

  // 📚 HeadObject pregunta por el objeto sin descargar su contenido. Sirve para
  // 📚 comprobar existencia y obtener longitud/tipo/ETag antes de una lectura.
  async head(key: string): Promise<StoredObjectInfo | null> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      })
      return {
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        // 📚 ETag es un validador opaco para revalidar futuras respuestas HTTP;
        // 📚 no debemos asumir que siempre sea un hash del archivo.
        etag: result.ETag,
      }
    } catch (error) {
      // 📚 404 significa «no existe»; fallos de permisos o del servidor se propagan.
      if (isNotFound(error)) return null
      throw error
    }
  }

  // 📚 GetObject descarga el contenido. Devolvemos null solo cuando no existe la
  // 📚 clave; un fallo de permisos o del servicio debe llegar al manejador de errores.
  async get(key: string): Promise<StoredObject | null> {
    const deadline = Date.now() + 30_000
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }), {
        abortSignal: AbortSignal.timeout(30_000),
      })
      // 📚 El backend se ejecuta en Node y necesita su tipo de flujo para enviarlo
      // 📚 después con Express; una respuesta sin cuerpo válido no es una imagen.
      if (!(result.Body instanceof Readable)) {
        throw new Error("El almacenamiento no devolvió un flujo de lectura de Node")
      }
      const body = result.Body
      // 📚 GET resuelve al recibir cabeceras, no al terminar el archivo. Este reloj
      // 📚 cubre también un cuerpo que siga abierto, incluso si llegan bytes a goteo.
      const timer = setTimeout(() => body.destroy(new Error("OBJECT_READ_TIMEOUT")), Math.max(1, deadline - Date.now()))
      timer.unref()
      const clearDeadline = (): void => { clearTimeout(timer) }
      body.once("close", clearDeadline)
      body.once("end", clearDeadline)
      // 📚 El consumidor puede tardar en conectar el pipeline: escuchar error evita
      // 📚 un evento sin manejador si el cuerpo expira durante esa preparación.
      body.on("error", clearDeadline)
      // 📚 GET entrega un flujo: Express podrá enviar los bytes sin duplicar
      // 📚 toda la imagen en memoria. Los permisos se comprobarán antes, en la ruta.
      return {
        body,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
        etag: result.ETag,
      }
    } catch (error) {
      if (isNotFound(error)) return null
      throw error
    }
  }

  // 📚 DeleteObject solo pide borrar la clave indicada. La futura capa de dominio
  // 📚 decidirá cuándo una imagen anterior ya no tiene referencias y puede borrarse.
  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }), {
      abortSignal: AbortSignal.timeout(30_000),
    })
  }

  // 📚 destroy cierra conexiones/recursos locales del SDK al terminar una prueba
  // 📚 o apagar el proceso; no borra el bucket ni los objetos almacenados.
  destroy(): void {
    this.client.destroy()
  }
}

// 📚 La fábrica centraliza la lectura del entorno y deja la clase inyectable en tests.
// 📚 Las rutas futuras podrán usarla sin conocer dónde se leen las variables S3.
export function createObjectStoreFromEnv(): ObjectStore {
  return new ObjectStore(objectStoreConfigFromEnv())
}
