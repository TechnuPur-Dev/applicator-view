-- CreateEnum
CREATE TYPE "CertificationType" AS ENUM ('FAA_PART_107', 'FAA_PART_137', 'FAA_44807', 'MEDICAL', 'INSURANCE', 'STATE_APPLICATOR_LICENSE', 'STATE_BUSINESS_LICENSE', 'STATE_CERTIFICATION', 'WRITTEN_TEST', 'ANNUAL_SAFETY', 'DRONE_REGISTRATION', 'CONDITIONS_LIMITATIONS', 'OTHER');

-- CreateTable
CREATE TABLE "Certification" (
    "id" SERIAL NOT NULL,
    "name" "CertificationType" NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "stateId" INTEGER,
    "additionalInfo" TEXT,
    "documentUrl" TEXT,
    "expiryDate" TIMESTAMP(3),
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
