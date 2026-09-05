-- La columna es opcional porque los hashes de invitaciones antiguas no se pueden descifrar.
ALTER TABLE "TeamInvitation" ADD COLUMN "tokenCiphertext" TEXT;
