CREATE TYPE "AchievementKind" AS ENUM ('STANDARD', 'PROGRESSIVE');

-- Valores conservadores: ninguna definición existente se convierte en progresiva o secreta.
ALTER TABLE "Logro"
  ADD COLUMN "kind" "AchievementKind" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "isSecret" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "targetValue" INTEGER,
  ADD CONSTRAINT "Logro_kind_target_check" CHECK (
    ("kind" = 'STANDARD' AND "targetValue" IS NULL) OR
    ("kind" = 'PROGRESSIVE' AND "targetValue" IS NOT NULL AND "targetValue" > 0)
  );

CREATE TABLE "AchievementProgress" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "logroId" INTEGER NOT NULL,
  "seasonId" INTEGER,
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AchievementProgress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AchievementProgress_nonnegative_check" CHECK ("currentValue" >= 0)
);

-- NULL representa el único contexto permanente y necesita un índice separado.
CREATE UNIQUE INDEX "AchievementProgress_permanent_key"
  ON "AchievementProgress"("userId", "logroId") WHERE "seasonId" IS NULL;
CREATE UNIQUE INDEX "AchievementProgress_seasonal_key"
  ON "AchievementProgress"("userId", "logroId", "seasonId") WHERE "seasonId" IS NOT NULL;
CREATE INDEX "AchievementProgress_logroId_idx" ON "AchievementProgress"("logroId");
CREATE INDEX "AchievementProgress_seasonId_idx" ON "AchievementProgress"("seasonId");

ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_logroId_fkey"
  FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AchievementProgress" ADD CONSTRAINT "AchievementProgress_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
