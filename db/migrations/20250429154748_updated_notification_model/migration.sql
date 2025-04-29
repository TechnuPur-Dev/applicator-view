-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "workerInviteId" INTEGER;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workerInviteId_fkey" FOREIGN KEY ("workerInviteId") REFERENCES "ApplicatorWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
