-- CreateEnum
CREATE TYPE "TranscriptionStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "MeetingFileTranscription" (
    "id" TEXT NOT NULL,
    "meetingFileId" TEXT NOT NULL,
    "status" "TranscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "text" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingFileTranscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingFileTranscription_meetingFileId_key" ON "MeetingFileTranscription"("meetingFileId");

-- CreateIndex
CREATE INDEX "MeetingFileTranscription_meetingFileId_idx" ON "MeetingFileTranscription"("meetingFileId");

-- AddForeignKey
ALTER TABLE "MeetingFileTranscription" ADD CONSTRAINT "MeetingFileTranscription_meetingFileId_fkey" FOREIGN KEY ("meetingFileId") REFERENCES "MeetingFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
