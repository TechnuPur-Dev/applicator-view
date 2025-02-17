/*
  Warnings:

  - You are about to drop the column `state` on the `Farm` table. All the data in the column will be lost.
  - You are about to drop the column `state` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Farm" DROP COLUMN "state",
ADD COLUMN     "config" JSONB,
ADD COLUMN     "farmImageUrl" TEXT,
ADD COLUMN     "stateId" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "Field" ADD COLUMN     "fieldImageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "state",
ADD COLUMN     "stateId" INTEGER NOT NULL DEFAULT 2;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
