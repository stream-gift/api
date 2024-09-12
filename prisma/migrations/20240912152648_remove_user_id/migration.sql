/*
  Warnings:

  - You are about to drop the column `userId` on the `Streamer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Streamer_userId_key";

-- AlterTable
ALTER TABLE "Streamer" DROP COLUMN "userId";
