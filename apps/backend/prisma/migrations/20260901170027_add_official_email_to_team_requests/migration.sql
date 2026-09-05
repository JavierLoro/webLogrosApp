/*
  Warnings:

  - Added the required column `officialEmail` to the `TeamRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeamRequest" ADD COLUMN     "officialEmail" TEXT NOT NULL;
