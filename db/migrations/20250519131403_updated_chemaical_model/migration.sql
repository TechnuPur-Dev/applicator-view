-- AlterTable
ALTER TABLE "Chemical" ADD COLUMN     "abns" TEXT,
ADD COLUMN     "labelDates" TEXT,
ADD COLUMN     "labelNames" TEXT,
ADD COLUMN     "meTooFlag" BOOLEAN,
ADD COLUMN     "meTooRefs" TEXT,
ADD COLUMN     "pmEmail" TEXT,
ADD COLUMN     "team" TEXT,
ADD COLUMN     "transferHistory" TEXT;
