-- DropForeignKey
ALTER TABLE "Farm" DROP CONSTRAINT "Farm_stateId_fkey";

-- AlterTable
ALTER TABLE "Farm" ADD COLUMN     "jdFarmId" TEXT,
ALTER COLUMN "stateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Field" ADD COLUMN     "jdFieldId" TEXT;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;
