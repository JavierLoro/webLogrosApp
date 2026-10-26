import { AsyncLocalStorage } from "node:async_hooks"
import { z } from "zod"

type MediaRuntimeContext = { ownerId: string; receiptId?: string }
const context = new AsyncLocalStorage<MediaRuntimeContext>()
const uuid = z.string().uuid()

// 📚 AsyncLocalStorage acompaña la cadena de await de UNA recepción; el router
// 📚 no necesita introducir IDs internos en el body ni cambiar los esquemas públicos.
export function withMediaRuntimeOwner<T>(ownerId: string, callback: () => Promise<T>, receiptId?: string): Promise<T> {
  uuid.parse(ownerId)
  if (receiptId !== undefined) uuid.parse(receiptId)
  return context.run({ ownerId, receiptId }, callback)
}

// 📚 Los servicios internos antiguos pueden no tener contexto; esos jobs legacy
// 📚 se conservan sin atribuirlos a un runtime cuya muerte no se puede demostrar.
export function getMediaRuntimeOwnerId(): string | undefined {
  return context.getStore()?.ownerId
}

export function getMediaRuntimeReceiptId(): string | undefined {
  return context.getStore()?.receiptId
}
