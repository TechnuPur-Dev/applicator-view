-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ViewTable" ADD VALUE 'PENDING_JOB';
ALTER TYPE "ViewTable" ADD VALUE 'REJECTED_JOB';

-- AlterTable
ALTER TABLE "ApplicatorGrower" ALTER COLUMN "inviteStatus" SET DEFAULT 'PENDING';
