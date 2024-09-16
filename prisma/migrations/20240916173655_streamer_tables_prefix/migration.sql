/*
  Warnings:

  - You are about to drop the `Settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Token` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_streamerId_fkey";

-- DropForeignKey
ALTER TABLE "Token" DROP CONSTRAINT "Token_streamerId_fkey";

-- DropTable
DROP TABLE "Settings";

-- DropTable
DROP TABLE "Token";

-- CreateTable
CREATE TABLE "StreamerToken" (
    "streamerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamerToken_pkey" PRIMARY KEY ("streamerId")
);

-- CreateTable
CREATE TABLE "StreamerSettings" (
    "streamerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "playNotificationSound" BOOLEAN NOT NULL DEFAULT true,
    "animationType" TEXT NOT NULL DEFAULT 'default',
    "animationParams" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "StreamerSettings_pkey" PRIMARY KEY ("streamerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "StreamerToken_streamerId_key" ON "StreamerToken"("streamerId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerSettings_streamerId_key" ON "StreamerSettings"("streamerId");

-- AddForeignKey
ALTER TABLE "StreamerToken" ADD CONSTRAINT "StreamerToken_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerSettings" ADD CONSTRAINT "StreamerSettings_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
