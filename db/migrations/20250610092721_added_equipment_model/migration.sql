-- AlterEnum
ALTER TYPE "EquipmentType" ADD VALUE 'CROP_DUSTER';

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "manufacturer" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL DEFAULT 'DRONE',
    "model" TEXT NOT NULL,
    "nickname" TEXT NOT NULL DEFAULT '',
    "serialNumber" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_serialNumber_key" ON "Equipment"("serialNumber");

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
