/*
  Warnings:

  - You are about to drop the `ZipCode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ZipCode" DROP CONSTRAINT "ZipCode_townshipId_fkey";

-- DropTable
DROP TABLE "ZipCode";
