/*
  Warnings:

  - You are about to drop the column `isLocked` on the `Address` table. All the data in the column will be lost.
  - Added the required column `pendingUntil` to the `Donation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Address" DROP COLUMN "isLocked";

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "pendingUntil" TIMESTAMP(3) NOT NULL;
