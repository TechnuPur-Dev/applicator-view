/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `ApplicatorGrower` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[inviteToken]` on the table `ApplicatorWorker` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ApplicatorGrower" ADD COLUMN     "inviteToken" TEXT;

-- AlterTable
ALTER TABLE "ApplicatorWorker" ADD COLUMN     "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorGrower_inviteToken_key" ON "ApplicatorGrower"("inviteToken");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorWorker_inviteToken_key" ON "ApplicatorWorker"("inviteToken");
