-- DropIndex
DROP INDEX "MeetingFile_meetingId_key";

-- CreateIndex
CREATE INDEX "MeetingFile_meetingId_idx" ON "MeetingFile"("meetingId");
