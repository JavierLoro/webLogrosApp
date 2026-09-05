-- CreateEnum
CREATE TYPE "SolicitudLogroStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "SolicitudLogro" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "logroId" INTEGER NOT NULL,
    "status" "SolicitudLogroStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "SolicitudLogro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitudLogro_userId_createdAt_idx" ON "SolicitudLogro"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SolicitudLogro_status_createdAt_idx" ON "SolicitudLogro"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SolicitudLogro" ADD CONSTRAINT "SolicitudLogro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudLogro" ADD CONSTRAINT "SolicitudLogro_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
