import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { test } from "node:test"
import { objectStoreConfigFromEnv } from "../config/objectStoreEnv"
import { ObjectStore } from "./objectStore"

const configured = ["S3_ENDPOINT", "S3_BUCKET", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
  .every((name) => Boolean(process.env[name]))

// 📚 Esta prueba usa el SeaweedFS real; un mock no demostraría firma, permisos ni
// 📚 compatibilidad de los cuatro comandos S3 que necesita el adaptador.
test("S3 guarda, lee, consulta y borra un objeto privado", { skip: !configured }, async () => {
  const config = objectStoreConfigFromEnv()
  const store = new ObjectStore(config)
  const key = `integracion/${randomUUID()}.txt`
  const expected = Buffer.from("prueba-adaptador-7.10", "utf8")

  try {
    assert.equal(await store.head(key), null)
    await store.put(key, expected, "text/plain")
    const info = await store.head(key)
    assert.equal(info?.contentType, "text/plain")
    assert.equal(info?.contentLength, expected.byteLength)
    assert.ok(info?.etag)

    const object = await store.get(key)
    assert.ok(object)
    assert.equal(object.contentType, "text/plain")
    assert.equal(object.contentLength, expected.byteLength)
    const chunks: Buffer[] = []
    for await (const chunk of object.body) chunks.push(Buffer.from(chunk))
    assert.deepEqual(Buffer.concat(chunks), expected)

    await store.delete(key)
    assert.equal(await store.head(key), null)

    const invalid = new ObjectStore({ ...config, secretAccessKey: `invalid-${randomUUID()}` })
    try {
      await assert.rejects(invalid.head(key), (error: unknown) => {
        const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        return status === 403
      })
    } finally {
      invalid.destroy()
    }
  } finally {
    // 📚 finally limpia incluso si falla una aserción, para no dejar pruebas en el bucket.
    await store.delete(key)
    store.destroy()
  }
})
