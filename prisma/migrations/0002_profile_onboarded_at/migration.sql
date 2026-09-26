-- AlterTable
ALTER TABLE "profile" ADD COLUMN "onboardedAt" TIMESTAMP(3);

-- Users who already uploaded a resume don't need to go through onboarding again.
UPDATE "profile" SET "onboardedAt" = CURRENT_TIMESTAMP WHERE "activeResumeId" IS NOT NULL;
