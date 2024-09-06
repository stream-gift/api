/*
  Warnings:

  - You are about to alter the column `amount` on the `Donation` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - The primary key for the `Settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `StreamerMoney` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currency` to the `Address` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `usd` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `StreamerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currency` to the `StreamerWithdrawal` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('SOL');

-- DropForeignKey
ALTER TABLE "StreamerMoney" DROP CONSTRAINT "StreamerMoney_userId_fkey";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "currency" "Currency" NOT NULL;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "currency" "Currency" NOT NULL,
ADD COLUMN     "usd" INTEGER NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey",
ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("userId");

-- AlterTable
ALTER TABLE "StreamerAddress" ADD COLUMN     "currency" "Currency" NOT NULL;

-- AlterTable
ALTER TABLE "StreamerWithdrawal" ADD COLUMN     "currency" "Currency" NOT NULL;

-- DropTable
DROP TABLE "StreamerMoney";

-- CreateTable
CREATE TABLE "StreamerBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerBalance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StreamerBalance" ADD CONSTRAINT "StreamerBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
