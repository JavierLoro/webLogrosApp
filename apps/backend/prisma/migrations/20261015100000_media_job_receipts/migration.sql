-- 📚 El token enlaza la admisión con la confirmación QUEUED; no certifica que el archivo ya se haya escrito.
BEGIN;

ALTER TABLE "MediaJob"
  ADD COLUMN "receiptToken" UUID,
  ADD COLUMN "receiptStartedAt" TIMESTAMP(3);

-- 📚 Las filas históricas permanecen sin recibo; uno nuevo exige ruta y tipo ya resueltos por el servidor.
ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_receipt_consistency" CHECK (
    (("receiptToken" IS NULL) = ("receiptStartedAt" IS NULL))
    AND (
      "receiptToken" IS NULL
      OR ("inputDirectory" IS NOT NULL AND "imageKind" IS NOT NULL)
    )
  );

COMMIT;
