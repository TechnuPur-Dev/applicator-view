/*
  Warnings:

  - You are about to drop the `ApplcatorGrower` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ViewTable" AS ENUM ('GROWER', 'Job');

-- DropForeignKey
ALTER TABLE "ApplcatorGrower" DROP CONSTRAINT "ApplcatorGrower_applicatorId_fkey";

-- DropForeignKey
ALTER TABLE "ApplcatorGrower" DROP CONSTRAINT "ApplcatorGrower_growerId_fkey";

-- DropTable
DROP TABLE "ApplcatorGrower";

-- CreateTable
CREATE TABLE "ApplicatorGrower" (
    "id" SERIAL NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "growerId" INTEGER NOT NULL,
    "applicatorFirstName" TEXT,
    "applicatorLastName" TEXT,
    "growerFirstName" TEXT,
    "growerLastName" TEXT,
    "inviteStatus" "InviteStatus" NOT NULL DEFAULT 'NOT_SENT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicatorGrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TableView" (
    "id" SERIAL NOT NULL,
    "createdById" INTEGER NOT NULL,
    "tableName" "ViewTable" NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorGrower_applicatorId_growerId_key" ON "ApplicatorGrower"("applicatorId", "growerId");

-- AddForeignKey
ALTER TABLE "ApplicatorGrower" ADD CONSTRAINT "ApplicatorGrower_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorGrower" ADD CONSTRAINT "ApplicatorGrower_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableView" ADD CONSTRAINT "TableView_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
