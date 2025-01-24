-- CreateEnum
CREATE TYPE "ProfileStatus" AS ENUM ('INCOMPLETE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GROWER', 'APPLICATOR', 'WORKER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('NOT_SENT', 'PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ViewTable" AS ENUM ('GROWER', 'Job');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('AERIAL', 'GROUND');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('GROWER', 'APPLICATOR', 'BIDDING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('TO_BE_MAPPED', 'READY_TO_SPRAY', 'SPRAYED', 'INVOICED', 'PAID');

-- CreateTable
CREATE TABLE "Otp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "profileImage" TEXT,
    "thumbnailProfileImage" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "fullName" TEXT DEFAULT '',
    "email" TEXT,
    "phoneNumber" TEXT,
    "password" TEXT,
    "role" "UserRole" NOT NULL,
    "businessName" TEXT,
    "experience" DECIMAL(65,30),
    "address1" TEXT,
    "address2" TEXT,
    "state" TEXT,
    "county" TEXT,
    "township" TEXT,
    "zipCode" TEXT,
    "bio" TEXT,
    "additionalInfo" TEXT,
    "profileStatus" "ProfileStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

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
    "isArchivedByApplicator" BOOLEAN NOT NULL DEFAULT false,
    "isArchivedByGrower" BOOLEAN NOT NULL DEFAULT false,
    "canManageFarms" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicatorGrower_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Farm" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "createdById" INTEGER NOT NULL,
    "growerId" INTEGER NOT NULL,
    "state" TEXT,
    "county" TEXT,
    "township" TEXT,
    "zipCode" TEXT,
    "isActive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FarmPermission" (
    "id" SERIAL NOT NULL,
    "farmId" INTEGER NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "crop" TEXT,
    "acres" DECIMAL(65,30),
    "legal" TEXT,
    "latitude" TEXT,
    "longitude" TEXT,
    "createdById" INTEGER NOT NULL,
    "farmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "source" "JobSource" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'TO_BE_MAPPED',
    "growerId" INTEGER,
    "applicatorId" INTEGER,
    "fieldWorkerId" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "farmId" INTEGER NOT NULL,
    "sensitiveAreas" TEXT,
    "adjacentCrops" TEXT,
    "specialInstructions" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldJob" (
    "id" SERIAL NOT NULL,
    "fieldId" INTEGER NOT NULL,
    "jobId" INTEGER NOT NULL,
    "actualAcres" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobProduct" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ratePerAcre" DECIMAL(65,30) NOT NULL,
    "totalAcres" DECIMAL(65,30) NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "JobProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplicationFee" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "rateUoM" DECIMAL(65,30) NOT NULL,
    "perAcre" BOOLEAN NOT NULL,

    CONSTRAINT "JobApplicationFee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Otp_email_key" ON "Otp"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorGrower_applicatorId_growerId_key" ON "ApplicatorGrower"("applicatorId", "growerId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldJob_fieldId_jobId_key" ON "FieldJob"("fieldId", "jobId");

-- CreateIndex
CREATE INDEX "JobProduct_jobId_idx" ON "JobProduct"("jobId");

-- CreateIndex
CREATE INDEX "JobApplicationFee_jobId_idx" ON "JobApplicationFee"("jobId");

-- AddForeignKey
ALTER TABLE "ApplicatorGrower" ADD CONSTRAINT "ApplicatorGrower_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorGrower" ADD CONSTRAINT "ApplicatorGrower_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Farm" ADD CONSTRAINT "Farm_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPermission" ADD CONSTRAINT "FarmPermission_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPermission" ADD CONSTRAINT "FarmPermission_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Field" ADD CONSTRAINT "Field_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableView" ADD CONSTRAINT "TableView_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_growerId_fkey" FOREIGN KEY ("growerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_fieldWorkerId_fkey" FOREIGN KEY ("fieldWorkerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldJob" ADD CONSTRAINT "FieldJob_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldJob" ADD CONSTRAINT "FieldJob_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobProduct" ADD CONSTRAINT "JobProduct_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationFee" ADD CONSTRAINT "JobApplicationFee_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
