-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "inventoryUnit" DROP NOT NULL,
ALTER COLUMN "appliedUnits" DROP NOT NULL;
