-- Nullable: las cuentas existentes no necesitan un nombre ficticio para migrar.
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;

-- Los registros previos reciben la fecha de migración; no representa su alta histórica.
ALTER TABLE "Logro" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
