/*
  Warnings:

  - You are about to drop the column `amountString` on the `Donation` table. All the data in the column will be lost.
  - Added the required column `amountAtomic` to the `StreamerWithdrawal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amountFloat` to the `StreamerWithdrawal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Donation" DROP COLUMN "amountString";

-- AlterTable
ALTER TABLE "StreamerBalance" ADD COLUMN     "balanceAtomic" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "balanceFloat" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StreamerWithdrawal" ADD COLUMN     "amountAtomic" INTEGER NOT NULL,
ADD COLUMN     "amountFloat" DOUBLE PRECISION NOT NULL;
