-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GROWER', 'APPLICATOR', 'WORKER');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
