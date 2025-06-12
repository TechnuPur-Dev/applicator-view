-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('DOLLAR', 'PERCENTAGE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "autoAcceptInvite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteAcceptType" "OfferType",
ADD COLUMN     "minAcceptableAmount" DECIMAL(65,30);
