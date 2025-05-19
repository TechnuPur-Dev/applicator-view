/*
  Warnings:

  - Made the column `geojsonData` on table `DroneFlightLog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DroneFlightLog" ALTER COLUMN "geojsonData" SET NOT NULL;
