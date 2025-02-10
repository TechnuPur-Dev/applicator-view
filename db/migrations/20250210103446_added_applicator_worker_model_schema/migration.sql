/*
  Warnings:

  - The values [Job] on the enum `ViewTable` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "WorkerType" AS ENUM ('PILOT', 'DRONE_OPERATOR', 'FIELD_OPERATOR', 'SCOUT', 'MECHANIC', 'ADVISOR', 'COORDINATOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "JobStatus" ADD VALUE 'PENDING';
ALTER TYPE "JobStatus" ADD VALUE 'REJECTED';
ALTER TYPE "JobStatus" ADD VALUE 'OPEN_FOR_BIDDING';

-- AlterEnum
BEGIN;
CREATE TYPE "ViewTable_new" AS ENUM ('GROWER', 'JOB');
ALTER TABLE "TableView" ALTER COLUMN "tableName" TYPE "ViewTable_new" USING ("tableName"::text::"ViewTable_new");
ALTER TYPE "ViewTable" RENAME TO "ViewTable_old";
ALTER TYPE "ViewTable_new" RENAME TO "ViewTable";
DROP TYPE "ViewTable_old";
COMMIT;

-- CreateTable
CREATE TABLE "ApplicatorWorker" (
    "id" SERIAL NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "workerId" INTEGER NOT NULL,
    "workerType" "WorkerType" NOT NULL,
    "pilotLicenseNumber" TEXT,
    "businessLicenseNumber" TEXT,
    "planeOrUnitNumber" TEXT,
    "perAcrePricing" DECIMAL(65,30),
    "percentageFee" DECIMAL(65,30),
    "dollarPerAcre" DECIMAL(65,30),
    "autoAcceptJobs" BOOLEAN NOT NULL DEFAULT false,
    "canViewPricingDetails" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicatorWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorWorker_applicatorId_workerId_key" ON "ApplicatorWorker"("applicatorId", "workerId");

-- AddForeignKey
ALTER TABLE "ApplicatorWorker" ADD CONSTRAINT "ApplicatorWorker_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorWorker" ADD CONSTRAINT "ApplicatorWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
