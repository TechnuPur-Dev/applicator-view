/*
  Warnings:

  - You are about to drop the column `rejectionReason` on the `Job` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Job" DROP COLUMN "rejectionReason";

-- CreateTable
CREATE TABLE "JobActivity" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changedByRole" "UserRole" NOT NULL,
    "oldStatus" "JobStatus" NOT NULL,
    "newStatus" "JobStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JobActivity_jobId_key" ON "JobActivity"("jobId");

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobActivity" ADD CONSTRAINT "JobActivity_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
