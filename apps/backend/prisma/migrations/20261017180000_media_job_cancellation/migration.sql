-- 📚 El marcador durable permite solicitar cancelación aunque el receptor o worker
-- 📚 siga vivo; el índice ayuda al runtime a encontrar trabajos cancelados pendientes.
BEGIN;

ALTER TABLE "MediaJob"
  ADD COLUMN "cancelRequestedAt" TIMESTAMP(3);

CREATE INDEX "MediaJob_runtimeOwnerId_cancelRequestedAt_status_idx"
  ON "MediaJob"("runtimeOwnerId", "cancelRequestedAt", "status");

COMMIT;
