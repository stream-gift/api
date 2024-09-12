-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "animationParams" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileBanner" TEXT,
ADD COLUMN     "profileColor" TEXT,
ADD COLUMN     "profileImage" TEXT;
