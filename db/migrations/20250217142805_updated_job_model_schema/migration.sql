/*
  Warnings:

  - You are about to drop the column `name` on the `JobProduct` table. All the data in the column will be lost.
  - You are about to drop the column `ratePerAcre` on the `JobProduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "JobProduct" DROP COLUMN "name",
DROP COLUMN "ratePerAcre",
ADD COLUMN     "productId" INTEGER NOT NULL DEFAULT 2;

-- AddForeignKey
ALTER TABLE "JobProduct" ADD CONSTRAINT "JobProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
