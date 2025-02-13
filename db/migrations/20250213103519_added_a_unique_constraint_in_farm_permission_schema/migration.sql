/*
  Warnings:

  - A unique constraint covering the columns `[farmId,applicatorId]` on the table `FarmPermission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FarmPermission_farmId_applicatorId_key" ON "FarmPermission"("farmId", "applicatorId");
