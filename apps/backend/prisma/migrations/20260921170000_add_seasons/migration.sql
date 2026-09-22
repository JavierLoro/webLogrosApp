CREATE TYPE "SeasonStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');
CREATE TYPE "AchievementScope" AS ENUM ('PERMANENT', 'SEASONAL');

ALTER TABLE "Logro"
  ADD COLUMN "scope" "AchievementScope" NOT NULL DEFAULT 'PERMANENT';

CREATE TABLE "Season" (
  "id" SERIAL NOT NULL,
  "teamId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "SeasonStatus" NOT NULL DEFAULT 'PLANNED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SolicitudLogro" ADD COLUMN "seasonId" INTEGER;
ALTER TABLE "UserLogro" ADD COLUMN "seasonId" INTEGER;

DROP INDEX "UserLogro_userId_logroId_key";

CREATE UNIQUE INDEX "Season_teamId_name_key" ON "Season"("teamId", "name");
CREATE INDEX "Season_teamId_status_idx" ON "Season"("teamId", "status");
CREATE UNIQUE INDEX "Season_one_active_per_team_key" ON "Season"("teamId") WHERE "status" = 'ACTIVE';
CREATE INDEX "SolicitudLogro_seasonId_idx" ON "SolicitudLogro"("seasonId");
CREATE INDEX "UserLogro_seasonId_idx" ON "UserLogro"("seasonId");

-- Los NULL no se comparan como iguales en una clave compuesta normal. Estos índices
-- expresan por separado las reglas permanente y estacional sin guardar arrays de IDs.
CREATE UNIQUE INDEX "UserLogro_permanent_award_key"
  ON "UserLogro"("userId", "logroId") WHERE "seasonId" IS NULL;
CREATE UNIQUE INDEX "UserLogro_seasonal_award_key"
  ON "UserLogro"("userId", "logroId", "seasonId") WHERE "seasonId" IS NOT NULL;

ALTER TABLE "Season" ADD CONSTRAINT "Season_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SolicitudLogro" ADD CONSTRAINT "SolicitudLogro_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserLogro" ADD CONSTRAINT "UserLogro_seasonId_fkey"
  FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
