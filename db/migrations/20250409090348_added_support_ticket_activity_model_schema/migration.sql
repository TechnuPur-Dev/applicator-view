-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "SupportTicketActivity" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "updatedById" INTEGER,
    "oldStatus" "TicketStatus" NOT NULL,
    "newStatus" "TicketStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketActivity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketActivity" ADD CONSTRAINT "SupportTicketActivity_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
