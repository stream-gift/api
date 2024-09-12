/*
  Warnings:

  - You are about to drop the column `userId` on the `Donation` table. All the data in the column will be lost.
  - The primary key for the `Settings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `userId` on the `Settings` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `StreamerAddress` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `StreamerBalance` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `StreamerWithdrawal` table. All the data in the column will be lost.
  - You are about to drop the column `clerkId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileBanner` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileColor` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `profileImage` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[streamerId]` on the table `Settings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[streamerId,currency]` on the table `StreamerBalance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `streamerId` to the `Donation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamerId` to the `Settings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamerId` to the `StreamerAddress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamerId` to the `StreamerBalance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamerId` to the `StreamerWithdrawal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Donation" DROP CONSTRAINT "Donation_userId_fkey";

-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_userId_fkey";

-- DropForeignKey
ALTER TABLE "StreamerAddress" DROP CONSTRAINT "StreamerAddress_userId_fkey";

-- DropForeignKey
ALTER TABLE "StreamerBalance" DROP CONSTRAINT "StreamerBalance_userId_fkey";

-- DropForeignKey
ALTER TABLE "StreamerWithdrawal" DROP CONSTRAINT "StreamerWithdrawal_userId_fkey";

-- DropIndex
DROP INDEX "Settings_userId_key";

-- DropIndex
DROP INDEX "StreamerBalance_userId_currency_key";

-- DropIndex
DROP INDEX "User_clerkId_key";

-- DropIndex
DROP INDEX "User_username_key";

-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "userId",
ADD COLUMN     "streamerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_pkey",
DROP COLUMN "userId",
ADD COLUMN     "streamerId" TEXT NOT NULL,
ADD CONSTRAINT "Settings_pkey" PRIMARY KEY ("streamerId");

-- AlterTable
ALTER TABLE "StreamerAddress" DROP COLUMN "userId",
ADD COLUMN     "streamerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StreamerBalance" DROP COLUMN "userId",
ADD COLUMN     "streamerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "StreamerWithdrawal" DROP COLUMN "userId",
ADD COLUMN     "streamerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "clerkId",
DROP COLUMN "profileBanner",
DROP COLUMN "profileColor",
DROP COLUMN "profileImage",
DROP COLUMN "username",
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "Streamer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileImage" TEXT,
    "profileBanner" TEXT,
    "profileColor" TEXT,

    CONSTRAINT "Streamer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Streamer_userId_key" ON "Streamer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Streamer_username_key" ON "Streamer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_streamerId_key" ON "Settings"("streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerBalance_streamerId_currency_key" ON "StreamerBalance"("streamerId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerAddress" ADD CONSTRAINT "StreamerAddress_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerBalance" ADD CONSTRAINT "StreamerBalance_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerWithdrawal" ADD CONSTRAINT "StreamerWithdrawal_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
