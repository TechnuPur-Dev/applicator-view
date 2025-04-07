/*
  Warnings:

  - Changed the type of `name` on the `Permission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('DASHBOARD', 'JOBS', 'MY_JOBS', 'BIDDING_JOBS', 'PENDING_APPROVALS', 'REJECTED_JOBS', 'GROWERS', 'MY_GROWERS', 'PENDING_INVITES', 'EQUIPMENT', 'WARRANTY_REGISTRATION', 'SUPPORT_TICKETS', 'FORUM', 'REPORTS', 'PILOTS_OPERATORS', 'MY_PILOTS_OPERATORS', 'PILOT_PENDING_INVITES', 'SETTINGS', 'PRODUCTS', 'INTEGRATIONS', 'USER_ADMIN');

-- DropForeignKey
ALTER TABLE "ApplicatorUser" DROP CONSTRAINT "ApplicatorUser_applicatorId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicatorUser" DROP CONSTRAINT "ApplicatorUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicatorUserPermission" DROP CONSTRAINT "ApplicatorUserPermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicatorUserPermission" DROP CONSTRAINT "ApplicatorUserPermission_userId_fkey";

-- DropIndex
DROP INDEX "Permission_name_key";

-- AlterTable
ALTER TABLE "Permission" DROP COLUMN "name",
ADD COLUMN     "name" "PermissionType" NOT NULL;

-- AddForeignKey
ALTER TABLE "ApplicatorUser" ADD CONSTRAINT "ApplicatorUser_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUser" ADD CONSTRAINT "ApplicatorUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUserPermission" ADD CONSTRAINT "ApplicatorUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ApplicatorUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUserPermission" ADD CONSTRAINT "ApplicatorUserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
