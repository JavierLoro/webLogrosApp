-- 📚 Owner durable y ruta exacta del proceso permiten demostrar qué trabajos son
-- 📚 recuperables; las columnas nullable preservan filas anteriores sin adivinar su dueño.
BEGIN;

CREATE TABLE "MediaRuntimeOwner" (
  "id" UUID NOT NULL,
  "hostId" VARCHAR(255) NOT NULL,
  "processId" INTEGER NOT NULL,
  "temporaryRoot" VARCHAR(2048) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  CONSTRAINT "MediaRuntimeOwner_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MediaRuntimeOwner"
  ADD CONSTRAINT "MediaRuntimeOwner_processId_positive_check"
  CHECK ("processId" > 0);

ALTER TABLE "MediaJob"
  ADD COLUMN "runtimeOwnerId" UUID,
  ADD COLUMN "runtimeReceiptId" UUID,
  ADD COLUMN "workerPid" INTEGER,
  ADD COLUMN "workerDirectory" VARCHAR(2048),
  ADD COLUMN "temporaryCleanedAt" TIMESTAMP(3);

CREATE INDEX "MediaRuntimeOwner_hostId_processId_startedAt_idx"
  ON "MediaRuntimeOwner"("hostId", "processId", "startedAt");
CREATE INDEX "MediaRuntimeOwner_closedAt_startedAt_idx"
  ON "MediaRuntimeOwner"("closedAt", "startedAt");
CREATE INDEX "MediaJob_runtimeOwnerId_status_idx"
  ON "MediaJob"("runtimeOwnerId", "status");
CREATE INDEX "MediaJob_runtimeOwnerId_runtimeReceiptId_status_idx"
  ON "MediaJob"("runtimeOwnerId", "runtimeReceiptId", "status");
CREATE INDEX "MediaJob_status_temporaryCleanedAt_completedAt_idx"
  ON "MediaJob"("status", "temporaryCleanedAt", "completedAt");

ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_runtimeOwnerId_fkey"
  FOREIGN KEY ("runtimeOwnerId") REFERENCES "MediaRuntimeOwner"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_workerPid_workerDirectory_pair_check"
  CHECK (("workerPid" IS NULL AND "workerDirectory" IS NULL)
      OR ("workerPid" IS NOT NULL AND "workerPid" > 0 AND "workerDirectory" IS NOT NULL)),
  ADD CONSTRAINT "MediaJob_runtimeReceiptId_requires_owner_check"
  CHECK ("runtimeReceiptId" IS NULL OR "runtimeOwnerId" IS NOT NULL),
  ADD CONSTRAINT "MediaJob_temporaryCleanedAt_terminal_check"
  CHECK ("temporaryCleanedAt" IS NULL OR "status" IN ('SUCCEEDED', 'FAILED', 'CANCELED', 'INTERRUPTED'));

COMMIT;
