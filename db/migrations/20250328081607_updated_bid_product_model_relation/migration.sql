-- DropForeignKey
ALTER TABLE "BidProduct" DROP CONSTRAINT "BidProduct_productId_fkey";

-- AddForeignKey
ALTER TABLE "BidProduct" ADD CONSTRAINT "BidProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "JobProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
