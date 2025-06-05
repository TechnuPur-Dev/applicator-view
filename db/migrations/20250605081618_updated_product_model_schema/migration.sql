-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productCategory" TEXT,
ADD COLUMN     "productType" TEXT,
ALTER COLUMN "baseProductName" DROP NOT NULL;
