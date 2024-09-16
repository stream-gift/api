-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "index" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "transactionHash" TEXT;
