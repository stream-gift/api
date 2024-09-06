/*
  Warnings:

  - The `status` column on the `Donation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `StreamerWithdrawal` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "StreamerWithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "status",
ADD COLUMN     "status" "DonationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "StreamerWithdrawal" DROP COLUMN "status",
ADD COLUMN     "status" "StreamerWithdrawalStatus" NOT NULL DEFAULT 'PENDING';
