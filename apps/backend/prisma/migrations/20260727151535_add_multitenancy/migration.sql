/*
  Warnings:

  - Added the required column `teamId` to the `Logro` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Logro" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "icono" TEXT,
ADD COLUMN     "teamId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "teamId" INTEGER;

-- CreateTable
CREATE TABLE "Team" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLogro" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "logroId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLogro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserLogro_userId_logroId_key" ON "UserLogro"("userId", "logroId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logro" ADD CONSTRAINT "Logro_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogro" ADD CONSTRAINT "UserLogro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogro" ADD CONSTRAINT "UserLogro_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
