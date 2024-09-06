/*
  Warnings:

  - A unique constraint covering the columns `[userId,currency]` on the table `StreamerBalance` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "StreamerBalance_userId_currency_key" ON "StreamerBalance"("userId", "currency");
