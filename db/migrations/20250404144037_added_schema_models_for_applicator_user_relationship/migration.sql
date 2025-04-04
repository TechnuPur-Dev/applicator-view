-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'APPLICATOR_USER';

-- CreateTable
CREATE TABLE "ApplicatorUser" (
    "id" SERIAL NOT NULL,
    "applicatorId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicatorUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicatorUserPermission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "canView" BOOLEAN NOT NULL DEFAULT true,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ApplicatorUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorUser_applicatorId_userId_key" ON "ApplicatorUser"("applicatorId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicatorUserPermission_userId_permissionId_key" ON "ApplicatorUserPermission"("userId", "permissionId");

-- AddForeignKey
ALTER TABLE "ApplicatorUser" ADD CONSTRAINT "ApplicatorUser_applicatorId_fkey" FOREIGN KEY ("applicatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUser" ADD CONSTRAINT "ApplicatorUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUserPermission" ADD CONSTRAINT "ApplicatorUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ApplicatorUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicatorUserPermission" ADD CONSTRAINT "ApplicatorUserPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
