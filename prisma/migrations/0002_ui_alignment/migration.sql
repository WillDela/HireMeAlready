-- AlterTable
ALTER TABLE "profile" ADD COLUMN     "discoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareResume" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "resume" ADD COLUMN     "sizeBytes" INTEGER;

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE "feedback" DROP COLUMN "improvements",
DROP COLUMN "rating",
DROP COLUMN "strengths",
ADD COLUMN     "comments" TEXT NOT NULL,
ADD COLUMN     "communication" INTEGER NOT NULL,
ADD COLUMN     "confidence" INTEGER NOT NULL,
ADD COLUMN     "technical" INTEGER NOT NULL;

