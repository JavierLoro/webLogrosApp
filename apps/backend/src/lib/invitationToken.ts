import crypto from "node:crypto"
import { JWT_SECRET } from "../config/env"

const ALGORITHM = "aes-256-gcm"
// 📚 Separación de claves: derivamos una clave exclusiva para invitaciones, de modo que el
//    secreto validado no se usa directamente como material AES ni se guarda junto al cifrado.
const ENCRYPTION_KEY = crypto
  .createHash("sha256")
  .update(`weblogros:invitation-token:v1:${JWT_SECRET}`)
  .digest()

export function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

// 📚 AES-GCM cifra y autentica: además de ocultar el token, detecta si el valor almacenado
//    fue manipulado. El IV aleatorio permite cifrar tokens distintos de forma independiente.
export function encryptInvitationToken(token: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return ["v1", iv.toString("base64url"), authTag.toString("base64url"), ciphertext.toString("base64url")].join(".")
}

export function decryptInvitationToken(value: string): string {
  const [version, ivValue, authTagValue, ciphertextValue] = value.split(".")
  if (version !== "v1" || !ivValue || !authTagValue || !ciphertextValue) {
    throw new Error("Formato de token cifrado no reconocido")
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}
