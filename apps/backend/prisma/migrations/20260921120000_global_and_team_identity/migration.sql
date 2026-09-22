-- La identidad real es global. Nullable permite incorporar cuentas anteriores sin inventar datos.
ALTER TABLE "User"
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT;

-- El nombre visible es contextual: cada membresía puede elegir su propio alias.
ALTER TABLE "TeamMembership" ADD COLUMN "displayName" TEXT;

-- Backfill compatible: el antiguo nombre global pasa a todas las membresías existentes.
-- NULLIF evita convertir cadenas vacías o compuestas solo por espacios en alias reales.
UPDATE "TeamMembership" AS membership
SET "displayName" = NULLIF(BTRIM("User"."displayName"), '')
FROM "User"
WHERE membership."userId" = "User"."id"
  AND membership."displayName" IS NULL;
