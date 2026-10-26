-- 📚 Migración aditiva: introduce estado de trabajo, sin modificar imágenes/datos existentes.
BEGIN;

CREATE TYPE "MediaJobState" AS ENUM (
  'RECEIVING', 'QUEUED', 'PROCESSING', 'PUBLISHING',
  'SUCCEEDED', 'FAILED', 'CANCELED', 'INTERRUPTED'
);

CREATE TABLE "MediaJob" (
  "id" UUID NOT NULL,
  "ownerId" INTEGER NOT NULL,
  "teamId" INTEGER,
  "resourceKey" VARCHAR(255) NOT NULL,
  "activeResourceKey" VARCHAR(255),
  "status" "MediaJobState" NOT NULL DEFAULT 'RECEIVING',
  "failureCode" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MediaJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaJob_resourceKey_nonempty" CHECK (length(btrim("resourceKey")) > 0),
  -- 📚 El destino se libera solo con un estado terminal y fecha de finalización.
  -- 📚 Una petición de cancelación futura mantendrá estado/reserva activos hasta parar.
  CONSTRAINT "MediaJob_active_resource_consistency" CHECK (
    (
      "status" IN ('RECEIVING', 'QUEUED', 'PROCESSING', 'PUBLISHING')
      AND "activeResourceKey" IS NOT NULL
      AND "activeResourceKey" = "resourceKey"
      AND "completedAt" IS NULL
    ) OR (
      "status" IN ('SUCCEEDED', 'FAILED', 'CANCELED', 'INTERRUPTED')
      AND "activeResourceKey" IS NULL
      AND "completedAt" IS NOT NULL
    )
  )
);

-- 📚 PostgreSQL decide quién gana incluso si dos peticiones intentan reservar a la vez.
CREATE UNIQUE INDEX "MediaJob_activeResourceKey_key" ON "MediaJob"("activeResourceKey");
CREATE INDEX "MediaJob_ownerId_createdAt_idx" ON "MediaJob"("ownerId", "createdAt");
CREATE INDEX "MediaJob_teamId_status_idx" ON "MediaJob"("teamId", "status");
CREATE INDEX "MediaJob_status_createdAt_idx" ON "MediaJob"("status", "createdAt");

ALTER TABLE "MediaJob" ADD CONSTRAINT "MediaJob_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MediaJob" ADD CONSTRAINT "MediaJob_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
