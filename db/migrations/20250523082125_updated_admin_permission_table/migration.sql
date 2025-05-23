/*
  Warnings:

  - The primary key for the `AdminPermission` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "AdminPermission" DROP CONSTRAINT "AdminPermission_pkey",
ADD CONSTRAINT "AdminPermission_pkey" PRIMARY KEY ("id");
