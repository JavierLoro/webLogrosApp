-- 📚 Registra el inicio one-shot y el resultado privado de Sharp sin crear un estado SUCCEEDED.
BEGIN;

ALTER TABLE "MediaJob"
  ADD COLUMN "executorStartedAt" TIMESTAMP(3),
  ADD COLUMN "imageKind" VARCHAR(24),
  ADD COLUMN "inputDirectory" VARCHAR(2048),
  ADD COLUMN "resultDirectory" VARCHAR(2048),
  ADD COLUMN "resultManifest" JSONB,
  ADD COLUMN "cleanupPendingDirectory" VARCHAR(2048);

-- 📚 CHECK mantiene combinaciones coherentes aunque una escritura omita el servicio CAS.
ALTER TABLE "MediaJob"
  ADD CONSTRAINT "MediaJob_image_kind_valid" CHECK (
    "imageKind" IS NULL OR "imageKind" IN ('achievement', 'logo', 'avatar')
  ),
  ADD CONSTRAINT "MediaJob_executor_start_consistency" CHECK (
    "executorStartedAt" IS NULL
    OR ("imageKind" IS NOT NULL AND "inputDirectory" IS NOT NULL)
  ),
  ADD CONSTRAINT "MediaJob_result_manifest_consistency" CHECK (
    (("resultDirectory" IS NULL) = ("resultManifest" IS NULL))
    AND ("resultManifest" IS NULL OR jsonb_typeof("resultManifest") = 'object')
    AND (
      "status" NOT IN ('RECEIVING', 'QUEUED', 'PROCESSING')
      OR ("resultDirectory" IS NULL AND "resultManifest" IS NULL)
    )
    AND (
      "status" <> 'PUBLISHING'
      OR (
        "executorStartedAt" IS NOT NULL
        AND "resultDirectory" IS NOT NULL
        AND "resultManifest" IS NOT NULL
      )
    )
  ),
  ADD CONSTRAINT "MediaJob_executor_start_state_consistency" CHECK (
    "status" NOT IN ('RECEIVING', 'QUEUED') OR "executorStartedAt" IS NULL
  );

COMMIT;
