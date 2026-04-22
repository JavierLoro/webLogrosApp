-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateTable
CREATE TABLE "UserLogros" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "logroId" INTEGER NOT NULL,
    "fechaObtenido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLogros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserLogros_userId_logroId_key" ON "UserLogros"("userId", "logroId");

-- AddForeignKey
ALTER TABLE "UserLogros" ADD CONSTRAINT "UserLogros_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLogros" ADD CONSTRAINT "UserLogros_logroId_fkey" FOREIGN KEY ("logroId") REFERENCES "Logro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
