-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InviteStatus" ADD VALUE 'DELETED_BY_APPLICATOR';
ALTER TYPE "InviteStatus" ADD VALUE 'DELETED_BY_GROWER';

-- AlterTable
ALTER TABLE "ApplicatorGrower" ADD COLUMN     "applicatorDeletedTill" TIMESTAMP(3),
ADD COLUMN     "growerDeletedTill" TIMESTAMP(3),
ADD COLUMN     "isDeletedByApplicator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isDeletedByGrower" BOOLEAN NOT NULL DEFAULT false;
