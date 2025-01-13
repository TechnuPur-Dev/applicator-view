-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "ApplcatorGrower" (
    "id" SERIAL NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "growerId" INTEGER NOT NULL,
    "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'NOT_SENT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplcatorGrower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplcatorGrower_applicatorId_growerId_key" ON "ApplcatorGrower"("applicatorId", "growerId");

-- AddForeignKey
ALTER TABLE "ApplcatorGrower" ADD CONSTRAINT "ApplcatorGrower_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplcatorGrower" ADD CONSTRAINT "ApplcatorGrower_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
