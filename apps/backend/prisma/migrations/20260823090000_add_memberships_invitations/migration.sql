-- Preserve existing User.teamId values while moving to an explicit N:N membership.
CREATE TYPE "TeamRole" AS ENUM ('TEAM_ADMIN', 'PLAYER');

CREATE TABLE "TeamMembership" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "role" "TeamRole" NOT NULL DEFAULT 'PLAYER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamInvitation" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMembership_userId_teamId_key" ON "TeamMembership"("userId", "teamId");
CREATE INDEX "TeamMembership_teamId_idx" ON "TeamMembership"("teamId");
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE INDEX "TeamInvitation_teamId_idx" ON "TeamInvitation"("teamId");

INSERT INTO "TeamMembership" ("userId", "teamId", "role")
SELECT "id", "teamId", 'PLAYER'::"TeamRole"
FROM "User"
WHERE "teamId" IS NOT NULL;

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_teamId_fkey";
ALTER TABLE "User" DROP COLUMN "teamId";

ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
