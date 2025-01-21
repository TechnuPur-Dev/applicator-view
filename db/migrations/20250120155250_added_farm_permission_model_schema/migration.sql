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

-- AddForeignKey
ALTER TABLE "FarmPermission" ADD CONSTRAINT "FarmPermission_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FarmPermission" ADD CONSTRAINT "FarmPermission_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
