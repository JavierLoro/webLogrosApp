-- 📚 La marca one-shot y las tablas de asset se añaden sin modificar los trabajos existentes.
BEGIN;

CREATE TYPE "MediaAssetState" AS ENUM ('STAGING', 'READY', 'RETIRED');
CREATE TYPE "MediaAssetCleanupStatus" AS ENUM ('PENDING', 'COMPLETE');

ALTER TABLE "MediaJob"
  ADD COLUMN "publisherStartedAt" TIMESTAMP(3);

CREATE TABLE "MediaAsset" (
  "id" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "teamId" INTEGER NOT NULL,
  "state" "MediaAssetState" NOT NULL DEFAULT 'STAGING',
  "variants" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "MediaJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MediaAsset_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MediaAsset_jobId_key" ON "MediaAsset"("jobId");
CREATE UNIQUE INDEX "MediaAsset_teamId_id_key" ON "MediaAsset"("teamId", "id");
CREATE INDEX "MediaAsset_teamId_state_idx" ON "MediaAsset"("teamId", "state");

ALTER TABLE "Logro" ADD COLUMN "imageAssetId" UUID;
CREATE UNIQUE INDEX "Logro_teamId_imageAssetId_key" ON "Logro"("teamId", "imageAssetId");
ALTER TABLE "Logro"
  ADD CONSTRAINT "Logro_teamId_imageAssetId_fkey"
  FOREIGN KEY ("teamId", "imageAssetId") REFERENCES "MediaAsset"("teamId", "id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "MediaAssetCleanup" (
  "id" UUID NOT NULL,
  "assetId" UUID NOT NULL,
  "keys" TEXT[] NOT NULL,
  "status" "MediaAssetCleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "MediaAssetCleanup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaAssetCleanup_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MediaAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MediaAssetCleanup_assetId_key" ON "MediaAssetCleanup"("assetId");
CREATE INDEX "MediaAssetCleanup_status_createdAt_idx" ON "MediaAssetCleanup"("status", "createdAt");

COMMIT;
