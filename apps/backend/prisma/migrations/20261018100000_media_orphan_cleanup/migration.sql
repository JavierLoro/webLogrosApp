BEGIN;

CREATE TYPE "MediaOrphanCleanupStatus" AS ENUM ('PENDING', 'COMPLETE');

CREATE TABLE "MediaOrphanCleanup" (
  "id" UUID NOT NULL,
  "jobId" UUID NOT NULL,
  "runtimeOwnerId" UUID NOT NULL,
  "receiptToken" UUID NOT NULL,
  "temporaryRoot" VARCHAR(2048) NOT NULL,
  "path" VARCHAR(2048) NOT NULL,
  "status" "MediaOrphanCleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastErrorCode" TEXT,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaOrphanCleanup_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MediaOrphanCleanup_runtimeOwnerId_fkey" FOREIGN KEY ("runtimeOwnerId")
    REFERENCES "MediaRuntimeOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MediaOrphanCleanup_jobId_key" ON "MediaOrphanCleanup"("jobId");
CREATE INDEX "MediaOrphanCleanup_status_lastActivityAt_idx" ON "MediaOrphanCleanup"("status", "lastActivityAt");

COMMIT;
