-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tiktokData" JSONB DEFAULT '{}',
ADD COLUMN     "tiktokImage" TEXT DEFAULT '';
