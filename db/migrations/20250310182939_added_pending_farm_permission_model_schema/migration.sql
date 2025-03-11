/*
  Warnings:

  - You are about to drop the column `pendingPermissions` on the `ApplicatorGrower` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApplicatorGrower" DROP COLUMN "pendingPermissions";

-- CreateTable
CREATE TABLE "PendingFarmPermission" (
    "id" SERIAL NOT NULL,
    "farmId" INTEGER NOT NULL,
    "inviteId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingFarmPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingFarmPermission_farmId_inviteId_key" ON "PendingFarmPermission"("farmId", "inviteId");

-- AddForeignKey
ALTER TABLE "PendingFarmPermission" ADD CONSTRAINT "PendingFarmPermission_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingFarmPermission" ADD CONSTRAINT "PendingFarmPermission_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ApplicatorGrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
