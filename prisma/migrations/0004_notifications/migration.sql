-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'RESULTS_READY', 'FEEDBACK_RECEIVED', 'RESUME_PARSED', 'REPORT_REVIEWED');

-- AlterTable
ALTER TABLE "report" ALTER COLUMN "reportedId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_userId_createdAt_idx" ON "notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

