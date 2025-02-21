/*
  Warnings:

  - You are about to drop the column `message` on the `Notification` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'JOB_REQUEST';

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "message";
