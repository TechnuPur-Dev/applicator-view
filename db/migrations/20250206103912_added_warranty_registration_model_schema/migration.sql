-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('DRONE', 'TRACTOR', 'SPRAYER', 'OTHER');

-- CreateTable
CREATE TABLE "WarrantyRegistration" (
    "id" SERIAL NOT NULL,
    "imageUrl" TEXT,
    "serialNumber" TEXT NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "isRegistered" BOOLEAN NOT NULL DEFAULT false,
    "documentUrl" TEXT,
    "warrantyExpiration" TIMESTAMP(3) NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarrantyRegistration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "WarrantyRegistration" ADD CONSTRAINT "WarrantyRegistration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
