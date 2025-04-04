/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `ApplicatorUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ApplicatorUser" ADD COLUMN     "inviteToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorUser_inviteToken_key" ON "ApplicatorUser"("inviteToken");
