/*
  Warnings:

  - You are about to drop the column `inviteAcceptType` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `minAcceptableAmount` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "inviteAcceptType",
DROP COLUMN "minAcceptableAmount",
ADD COLUMN     "minDollarPerAcre" DECIMAL(65,30),
ADD COLUMN     "minPercentageFee" DECIMAL(65,30);

-- DropEnum
DROP TYPE "OfferType";
