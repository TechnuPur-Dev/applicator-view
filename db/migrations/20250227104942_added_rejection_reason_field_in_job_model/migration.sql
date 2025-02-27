-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "rejectionReason" TEXT;

-- AlterTable
ALTER TABLE "JobProduct" ALTER COLUMN "productId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
