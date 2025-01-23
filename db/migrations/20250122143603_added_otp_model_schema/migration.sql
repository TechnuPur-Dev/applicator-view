/*
  Warnings:

  - You are about to drop the column `isArchived` on the `ApplicatorGrower` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('Aerial', 'Ground');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('Aerial', 'Ground');

-- AlterTable
ALTER TABLE "ApplicatorGrower" DROP COLUMN "isArchived",
ADD COLUMN     "canManageFarms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isArchivedByApplicator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isArchivedByGrower" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Otp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);
