/*
  Warnings:

  - Added the required column `categoria` to the `Logro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descripcion` to the `Logro` table without a default value. This is not possible if the table is not empty.
  - Added the required column `icono` to the `Logro` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Logro" ADD COLUMN     "categoria" TEXT NOT NULL,
ADD COLUMN     "descripcion" TEXT NOT NULL,
ADD COLUMN     "icono" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
