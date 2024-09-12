-- DropForeignKey
ALTER TABLE "Settings" DROP CONSTRAINT "Settings_streamerId_fkey";

-- DropForeignKey
ALTER TABLE "StreamerAddress" DROP CONSTRAINT "StreamerAddress_streamerId_fkey";

-- DropForeignKey
ALTER TABLE "StreamerBalance" DROP CONSTRAINT "StreamerBalance_streamerId_fkey";

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerAddress" ADD CONSTRAINT "StreamerAddress_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamerBalance" ADD CONSTRAINT "StreamerBalance_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
