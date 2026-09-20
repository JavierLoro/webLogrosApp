ALTER TABLE "Logro" ADD COLUMN "criterios" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE TYPE "PropuestaLogroStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TABLE "PropuestaLogro" (
  "id" SERIAL NOT NULL,
  "teamId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "criterios" TEXT[] NOT NULL,
  "status" "PropuestaLogroStatus" NOT NULL DEFAULT 'PENDING',
  "rejectionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "logroId" INTEGER,
  CONSTRAINT "PropuestaLogro_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PropuestaLogro_logroId_key" ON "PropuestaLogro"("logroId");
CREATE INDEX "PropuestaLogro_teamId_status_createdAt_idx" ON "PropuestaLogro"("teamId", "status", "createdAt");
CREATE INDEX "PropuestaLogro_teamId_userId_createdAt_idx" ON "PropuestaLogro"("teamId", "userId", "createdAt");
ALTER TABLE "PropuestaLogro" ADD CONSTRAINT "PropuestaLogro_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropuestaLogro" ADD CONSTRAINT "PropuestaLogro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PropuestaLogro" ADD CONSTRAINT "PropuestaLogro_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
