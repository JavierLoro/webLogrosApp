import { Prisma } from "@prisma/client"
import { AppError } from "../errors/AppError"
import prisma from "./prisma"
import { getMediaRuntimeOwnerId, getMediaRuntimeReceiptId } from "./mediaRuntimeContext"

// 📚 Selección explícita: consultar el estado no expone claves internas, rutas,
// 📚 credenciales ni campos futuros añadidos al modelo por accidente.
const mediaJobSelection = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  failureCode: true,
} satisfies Prisma.MediaJobSelect

export type MediaJobView = Prisma.MediaJobGetPayload<{ select: typeof mediaJobSelection }>
// 📚 db puede ser una transacción: la futura admisión podrá contar/reservar/registrar
// 📚 en la MISMA operación atómica, sin que este módulo abra una escritura aparte.
// 📚 Pick exige solo el delegate mediaJob, compatible con ambos tipos de cliente.
type MediaJobDatabase = Pick<Prisma.TransactionClient, "mediaJob">

export type RegisterMediaJobInput = {
  ownerId: number
  teamId?: number
  resourceKey: string
}

// 📚 Prisma con adapter-pg 7.5 informa algunas claves en cause.constraint.fields,
// 📚 con comillas SQL. Reconocemos solo nuestra reserva, no cualquier UNIQUE futuro.
function isActiveResourceConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return false
  const target = error.meta?.target
  const adapter = error.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined
  const fields = adapter?.cause?.constraint?.fields
  return (Array.isArray(target) && target.includes("activeResourceKey"))
    || target === "MediaJob_activeResourceKey_key"
    || (Array.isArray(fields) && fields.some((field) => field === "activeResourceKey" || field === '"activeResourceKey"'))
}

// 📚 @internal Solo tests históricos y admitReceivingMediaJob deben registrar directamente;
// 📚 ninguna ruta HTTP futura debe saltarse la capacidad compartida y la autorización previa.
export async function registerReceivingMediaJob(
  input: RegisterMediaJobInput,
  db: MediaJobDatabase = prisma,
): Promise<MediaJobView> {
  try {
    // 📚 resourceKey es canónica y creada por el backend, no un nombre/ID libre
    // 📚 enviado por el navegador. UNIQUE impide dos reservas activas del mismo destino.
    // 📚 await dentro de try permite capturar el rechazo Prisma y traducirlo a 409.
    return await db.mediaJob.create({
      data: {
        ownerId: input.ownerId,
        // 📚 Propiedad técnica separada del usuario: el reinicio solo recupera jobs
        // 📚 del proceso confirmado muerto, o de una recepción local ya cerrada.
        runtimeOwnerId: getMediaRuntimeOwnerId(),
        runtimeReceiptId: getMediaRuntimeReceiptId(),
        teamId: input.teamId,
        resourceKey: input.resourceKey,
        activeResourceKey: input.resourceKey,
        status: "RECEIVING",
      },
      select: mediaJobSelection,
    })
  } catch (error) {
    if (isActiveResourceConflict(error)) throw new AppError(409, "Ya hay un trabajo de imagen activo para este destino")
    throw error
  }
}

// 📚 Filtramos por usuario en la propia consulta. Conocer el UUID de otro trabajo
// 📚 no concede su lectura; la futura ruta tratará ausente/ajeno sin revelar diferencias.
export async function findMediaJobForOwner(
  id: string,
  ownerId: number,
  db: MediaJobDatabase = prisma,
): Promise<MediaJobView | null> {
  return db.mediaJob.findFirst({ where: { id, ownerId }, select: mediaJobSelection })
}
