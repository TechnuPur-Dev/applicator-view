-- AlterTable
ALTER TABLE "ApplicatorGrower" ALTER COLUMN "canManageFarms" SET DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "joiningDate" TIMESTAMP(3);
