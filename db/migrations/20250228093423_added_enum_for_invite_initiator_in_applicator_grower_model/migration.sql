-- CreateEnum
CREATE TYPE "InviteInitiator" AS ENUM ('APPLICATOR', 'GROWER');

-- AlterTable
ALTER TABLE "ApplicatorGrower" ADD COLUMN     "inviteInitiator" "InviteInitiator";
