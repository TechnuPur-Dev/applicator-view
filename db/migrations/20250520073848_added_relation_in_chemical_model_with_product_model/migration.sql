-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "chemicalId" INTEGER;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_chemicalId_fkey" FOREIGN KEY ("chemicalId") REFERENCES "Chemical"("id") ON DELETE CASCADE ON UPDATE CASCADE;
