import { unlink } from 'fs/promises';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MeetingFile } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ALLOWED_MIME_TYPES } from '../../meeting-file.constants';
import { UploadMeetingFileCommand } from '../impl/upload-meeting-file.command';

@CommandHandler(UploadMeetingFileCommand)
export class UploadMeetingFileHandler implements ICommandHandler<
  UploadMeetingFileCommand,
  MeetingFile
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    meetingId,
    file,
  }: UploadMeetingFileCommand): Promise<MeetingFile> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('Meeting not found');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Unsupported file type');
    }

    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const existing = await this.prisma.meetingFile.findUnique({
      where: { meetingId },
    });

    const meetingFile = await this.prisma.meetingFile.upsert({
      where: { meetingId },
      create: {
        meetingId,
        filename,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
      },
      update: {
        filename,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
      },
    });

    // Delete the previously stored file from disk only after the DB record
    // has been updated to point at the new one, so a mid-write failure never
    // leaves the meeting without any file on disk.
    if (existing) {
      await unlink(existing.storagePath).catch(() => undefined);
    }

    return meetingFile;
  }
}
