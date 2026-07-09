/*
  Warnings:

  - Made the column `customerPhone` on table `CreditPayment` required. This step will fail if there are existing NULL values in that column.
  - Made the column `phone` on table `Member` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "CreditPayment" ALTER COLUMN "customerPhone" SET NOT NULL;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "phone" SET NOT NULL;
