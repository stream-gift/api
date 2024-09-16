-- AlterEnum
ALTER TYPE "StreamerWithdrawalStatus" ADD VALUE 'SENT';

-- AlterTable
ALTER TABLE "StreamerWithdrawal" ADD COLUMN     "transactionHash" TEXT;
