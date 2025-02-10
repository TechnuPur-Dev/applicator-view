-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('INSECTICIDE', 'FUNGICIDE', 'ADJUVANT', 'HERBICIDE', 'PGR', 'DRY_FERTILIZER', 'LIQUID_FERTILIZER', 'SEED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('GALLON', 'PINT', 'QUART', 'FLOZ', 'TON', 'POUND', 'OUNCE', 'CASE', 'BAG', 'BULK_BAG', 'JUG', 'UNIT');

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "baseProductName" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "code" INTEGER,
    "category" "ProductCategory" NOT NULL,
    "restrictedUse" BOOLEAN NOT NULL DEFAULT false,
    "epaRegistration" TEXT,
    "company" TEXT,
    "inventoryUnit" "ProductUnit" NOT NULL,
    "appliedUnits" "ProductUnit" NOT NULL,
    "perAcreRate" DOUBLE PRECISION,
    "density" TEXT,
    "treatAsLiquid" BOOLEAN NOT NULL DEFAULT false,
    "canadSalesTax" DOUBLE PRECISION,
    "primaryNutrient" TEXT,
    "reentryInterval" INTEGER,
    "nutrients" JSONB,
    "jobPricePerMonth" JSONB NOT NULL DEFAULT '{}',
    "ticketPricePerMonth" JSONB NOT NULL DEFAULT '{}',
    "jobPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ticketPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "personalProtectiveEquipment" TEXT,
    "preHarvestInterval" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
