-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REJECT_INVITE';

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "inviteId" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "ApplicatorGrower"("id") ON DELETE CASCADE ON UPDATE CASCADE;
