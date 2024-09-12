/*
  Warnings:

  - You are about to drop the column `image` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "image",
ADD COLUMN     "googleData" JSONB DEFAULT '{}',
ADD COLUMN     "googleImage" TEXT DEFAULT '',
ADD COLUMN     "twitchData" JSONB DEFAULT '{}',
ADD COLUMN     "twitchImage" TEXT DEFAULT '';
