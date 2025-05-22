/*
  Warnings:

  - You are about to drop the column `jobPrice` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `ticketPrice` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "jobPrice",
DROP COLUMN "ticketPrice";
