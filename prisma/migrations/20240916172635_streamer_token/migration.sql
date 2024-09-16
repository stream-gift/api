-- CreateTable
CREATE TABLE "Token" (
    "streamerId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("streamerId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Token_streamerId_key" ON "Token"("streamerId");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_streamerId_fkey" FOREIGN KEY ("streamerId") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
