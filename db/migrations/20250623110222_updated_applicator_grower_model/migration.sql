/*
  Warnings:

  - You are about to drop the column `autoAcceptJobs` on the `ApplicatorGrower` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ApplicatorGrower" DROP COLUMN "autoAcceptJobs",
ADD COLUMN     "autoAcceptJobsByApplicator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "autoAcceptJobsByGrower" BOOLEAN NOT NULL DEFAULT false;
