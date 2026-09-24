-- Retirada conservadora: no inferimos nombres/apellidos ni restauramos alias borrados.
-- Todo texto legado no vacío debe estar ya representado en la identidad o en un alias.
-- La transacción y los bloqueos impiden cambios concurrentes entre el guard y el DROP.
BEGIN;
LOCK TABLE "User" IN ACCESS EXCLUSIVE MODE;
LOCK TABLE "TeamMembership" IN SHARE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User" AS u
    WHERE NULLIF(BTRIM(u."displayName"), '') IS NOT NULL
      AND BTRIM(u."displayName") <> BTRIM(CONCAT_WS(' ',
        NULLIF(BTRIM(u."firstName"), ''), NULLIF(BTRIM(u."lastName"), '')))
      AND NOT EXISTS (
        SELECT 1 FROM "TeamMembership" AS membership
        WHERE membership."userId" = u.id
          AND BTRIM(membership."displayName") = BTRIM(u."displayName")
      )
  ) THEN
    RAISE EXCEPTION 'Legacy displayName contains unrepresented values; review affected user IDs before retrying. No identity or alias was modified.';
  END IF;
END $$;

ALTER TABLE "User" DROP COLUMN "displayName";
COMMIT;
