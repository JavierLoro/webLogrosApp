-- 📚 Añade la reserva de dos puestos y la identidad del intento sin alterar trabajos existentes.
BEGIN;

ALTER TABLE "MediaJob"
  ADD COLUMN "processingSlot" INTEGER,
  ADD COLUMN "executionToken" UUID,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3);

-- 📚 CHECK protege las combinaciones de estado incluso si otra ruta omite el servicio.
ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_processing_slot_range" CHECK (
    "processingSlot" IS NULL OR "processingSlot" IN (1, 2)
  ),
  ADD CONSTRAINT "MediaJob_processing_claim_consistency" CHECK (
    (
      "status" IN ('PROCESSING', 'PUBLISHING')
      AND "processingSlot" IS NOT NULL
      AND "executionToken" IS NOT NULL
      AND "processingStartedAt" IS NOT NULL
    ) OR (
      "status" NOT IN ('PROCESSING', 'PUBLISHING')
      AND "processingSlot" IS NULL
      AND (
        "status" NOT IN ('RECEIVING', 'QUEUED')
        OR ("executionToken" IS NULL AND "processingStartedAt" IS NULL)
      )
      AND (
        "status" IN ('RECEIVING', 'QUEUED')
        OR (("executionToken" IS NULL) = ("processingStartedAt" IS NULL))
      )
    )
  );

-- 📚 El índice único de la ranura es una segunda barrera ante tomas concurrentes.
CREATE UNIQUE INDEX "MediaJob_processingSlot_key" ON "MediaJob"("processingSlot");

COMMIT;
