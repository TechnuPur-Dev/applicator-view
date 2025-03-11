-- AlterTable
ALTER TABLE "ApplicatorGrower" ADD COLUMN     "email" TEXT,
ADD COLUMN     "pendingPermissions" JSONB,
ALTER COLUMN "applicatorId" DROP NOT NULL;
