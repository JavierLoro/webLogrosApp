CREATE TYPE "AchievementDraftPurpose" AS ENUM ('PROPOSAL', 'DIRECT');
CREATE TYPE "AchievementDraftStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PUBLISHED', 'DISCARDED');
ALTER TABLE "PropuestaLogro" ADD COLUMN "imageAssetId" UUID, ADD COLUMN "imageRepairAllowed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "PropuestaLogro" SET "imageRepairAllowed" = true WHERE status = 'PENDING' AND "imageAssetId" IS NULL;
CREATE TABLE "AchievementDraft" (
 "id" UUID NOT NULL PRIMARY KEY, "userId" INTEGER NOT NULL, "teamId" INTEGER NOT NULL,
 "purpose" "AchievementDraftPurpose" NOT NULL, "status" "AchievementDraftStatus" NOT NULL DEFAULT 'DRAFT',
 "fields" JSONB NOT NULL DEFAULT '{}', "version" INTEGER NOT NULL DEFAULT 1,
 "submittedVersion" INTEGER, "resultId" INTEGER, "imageAssetId" UUID,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AchievementDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AchievementDraft_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AchievementDraft_imageAsset_fkey" FOREIGN KEY ("teamId", "imageAssetId") REFERENCES "MediaAsset"("teamId", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AchievementDraft_version_check" CHECK ("version" > 0),
 CONSTRAINT "AchievementDraft_result_check" CHECK (
  (status = 'DRAFT' AND "submittedVersion" IS NULL AND "resultId" IS NULL) OR
  (status = 'DISCARDED' AND "submittedVersion" IS NULL AND "resultId" IS NULL AND "imageAssetId" IS NULL) OR
  (status = 'SUBMITTED' AND purpose = 'PROPOSAL' AND "submittedVersion" IS NOT NULL AND "resultId" IS NOT NULL AND "imageAssetId" IS NULL) OR
  (status = 'PUBLISHED' AND purpose = 'DIRECT' AND "submittedVersion" IS NOT NULL AND "resultId" IS NOT NULL AND "imageAssetId" IS NULL))
);
CREATE UNIQUE INDEX "AchievementDraft_teamId_imageAssetId_key" ON "AchievementDraft"("teamId", "imageAssetId");
CREATE INDEX "AchievementDraft_userId_status_idx" ON "AchievementDraft"("userId", "status");
CREATE INDEX "AchievementDraft_teamId_userId_status_idx" ON "AchievementDraft"("teamId", "userId", "status");
CREATE UNIQUE INDEX "PropuestaLogro_teamId_imageAssetId_key" ON "PropuestaLogro"("teamId", "imageAssetId");
ALTER TABLE "PropuestaLogro" ADD CONSTRAINT "PropuestaLogro_imageAsset_fkey" FOREIGN KEY ("teamId", "imageAssetId") REFERENCES "MediaAsset"("teamId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
