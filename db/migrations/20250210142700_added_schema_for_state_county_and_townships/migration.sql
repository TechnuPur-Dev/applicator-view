-- CreateTable
CREATE TABLE "State" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "State_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "County" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" INTEGER NOT NULL,

    CONSTRAINT "County_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Township" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "countyId" INTEGER NOT NULL,

    CONSTRAINT "Township_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipCode" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "townshipId" INTEGER,

    CONSTRAINT "ZipCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "State_name_key" ON "State"("name");

-- CreateIndex
CREATE UNIQUE INDEX "County_name_stateId_key" ON "County"("name", "stateId");

-- CreateIndex
CREATE UNIQUE INDEX "Township_name_countyId_key" ON "Township"("name", "countyId");

-- CreateIndex
CREATE UNIQUE INDEX "ZipCode_code_key" ON "ZipCode"("code");

-- AddForeignKey
ALTER TABLE "County" ADD CONSTRAINT "County_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "State"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Township" ADD CONSTRAINT "Township_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZipCode" ADD CONSTRAINT "ZipCode_townshipId_fkey" FOREIGN KEY ("townshipId") REFERENCES "Township"("id") ON DELETE SET NULL ON UPDATE CASCADE;
