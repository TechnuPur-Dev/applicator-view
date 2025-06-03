/*
  Warnings:

  - A unique constraint covering the columns `[abbreviation]` on the table `State` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DroneFlightLog" ALTER COLUMN "droneId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "State" ADD COLUMN     "abbreviation" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "State_abbreviation_key" ON "State"("abbreviation");
