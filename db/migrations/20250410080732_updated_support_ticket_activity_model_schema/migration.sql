/*
  Warnings:

  - You are about to drop the column `jobId` on the `SupportTicketActivity` table. All the data in the column will be lost.
  - Added the required column `ticketId` to the `SupportTicketActivity` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SupportTicketActivity" DROP CONSTRAINT "SupportTicketActivity_jobId_fkey";

-- AlterTable
ALTER TABLE "SupportTicketActivity" DROP COLUMN "jobId",
ADD COLUMN     "ticketId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
