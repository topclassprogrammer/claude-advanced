-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "Meeting" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MeetingFile" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "MeetingFile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Meeting_organizerId_idx" ON "Meeting"("organizerId");
