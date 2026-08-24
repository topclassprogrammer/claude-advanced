-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MeetingFileSummary" (
    "id" TEXT NOT NULL,
    "meetingFileId" TEXT NOT NULL,
    "status" "SummaryStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "decisions" TEXT[],
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingFileSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SummaryActionItem" (
    "id" TEXT NOT NULL,
    "meetingFileSummaryId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "assignee" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SummaryActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingFileSummary_meetingFileId_key" ON "MeetingFileSummary"("meetingFileId");

-- CreateIndex
CREATE INDEX "MeetingFileSummary_meetingFileId_idx" ON "MeetingFileSummary"("meetingFileId");

-- CreateIndex
CREATE INDEX "SummaryActionItem_meetingFileSummaryId_idx" ON "SummaryActionItem"("meetingFileSummaryId");

-- AddForeignKey
ALTER TABLE "MeetingFileSummary" ADD CONSTRAINT "MeetingFileSummary_meetingFileId_fkey" FOREIGN KEY ("meetingFileId") REFERENCES "MeetingFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SummaryActionItem" ADD CONSTRAINT "SummaryActionItem_meetingFileSummaryId_fkey" FOREIGN KEY ("meetingFileSummaryId") REFERENCES "MeetingFileSummary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
