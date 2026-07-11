/*
  Warnings:

  - A unique constraint covering the columns `[orNumber]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "orNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_orNumber_key" ON "Transaction"("orNumber");
