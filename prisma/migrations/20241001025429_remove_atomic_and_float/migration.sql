/*
  Warnings:

  - You are about to drop the column `balanceAtomic` on the `StreamerBalance` table. All the data in the column will be lost.
  - You are about to drop the column `balanceFloat` on the `StreamerBalance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "StreamerBalance" DROP COLUMN "balanceAtomic",
DROP COLUMN "balanceFloat";
