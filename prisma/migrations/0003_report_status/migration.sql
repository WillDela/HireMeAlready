-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'ACTIONED', 'DISMISSED');

-- AlterTable
ALTER TABLE "report" ADD COLUMN "status" "ReportStatus" NOT NULL DEFAULT 'OPEN';
