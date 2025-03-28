/*
  Warnings:

  - You are about to drop the column `amount` on the `Bid` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jobId,applicatorId]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ApplicatorWorker" ALTER COLUMN "inviteStatus" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "amount";

-- CreateTable
CREATE TABLE "BidProduct" (
    "id" SERIAL NOT NULL,
    "bidId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "bidRateAcre" DECIMAL(65,30),
    "bidPrice" DECIMAL(65,30),

    CONSTRAINT "BidProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidApplicationFee" (
    "id" SERIAL NOT NULL,
    "bidId" INTEGER NOT NULL,
    "feeId" INTEGER NOT NULL,
    "bidAmount" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "BidApplicationFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BidProduct_bidId_idx" ON "BidProduct"("bidId");

-- CreateIndex
CREATE INDEX "BidApplicationFee_bidId_idx" ON "BidApplicationFee"("bidId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_jobId_applicatorId_key" ON "Bid"("jobId", "applicatorId");

-- AddForeignKey
ALTER TABLE "BidProduct" ADD CONSTRAINT "BidProduct_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidProduct" ADD CONSTRAINT "BidProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidApplicationFee" ADD CONSTRAINT "BidApplicationFee_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidApplicationFee" ADD CONSTRAINT "BidApplicationFee_feeId_fkey" FOREIGN KEY ("feeId") REFERENCES "JobApplicationFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
