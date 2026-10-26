-- 📚 Añade turno FIFO al terminar transferencia y caducidad solo para trabajos ya en espera.
BEGIN;

ALTER TABLE "MediaJob"
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "queueExpiresAt" TIMESTAMP(3);

-- 📚 Para QUEUED existentes, createdAt es el único orden reproducible disponible;
-- 📚 no liberamos RECEIVING antiguos porque no sabemos si su stream quedó cerrado.
UPDATE "MediaJob"
SET "queuedAt" = COALESCE("processingStartedAt", "createdAt"),
    "queueExpiresAt" = COALESCE("processingStartedAt", "createdAt") + INTERVAL '180 seconds'
WHERE "status" IN ('QUEUED', 'PROCESSING', 'PUBLISHING');

ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_queue_timing_consistency" CHECK (
    (("queuedAt" IS NULL) = ("queueExpiresAt" IS NULL))
    AND ("status" NOT IN ('QUEUED', 'PROCESSING', 'PUBLISHING')
      OR ("queuedAt" IS NOT NULL AND "queueExpiresAt" IS NOT NULL))
    AND ("status" <> 'RECEIVING' OR "queuedAt" IS NULL)
  );

CREATE INDEX "MediaJob_status_queuedAt_id_idx"
  ON "MediaJob"("status", "queuedAt", "id");

COMMIT;
