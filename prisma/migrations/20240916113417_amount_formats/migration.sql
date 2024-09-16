/*
  Warnings:

  - You are about to drop the column `usd` on the `Donation` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `Donation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Added the required column `amountAtomic` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountFloat` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountString` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountUsd` to the `Donation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "usd",
ADD COLUMN     "amountAtomic" INTEGER NOT NULL,
ADD COLUMN     "amountFloat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "amountString" TEXT NOT NULL,
ADD COLUMN     "amountUsd" INTEGER NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;
