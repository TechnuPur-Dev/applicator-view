-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('INCOMPLETE', 'COMPLETE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'INCOMPLETE';
