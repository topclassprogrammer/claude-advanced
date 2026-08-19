import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MeetingFile } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_MEETING,
} from '../../meeting-file.constants';
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

    const existingCount = await this.prisma.meetingFile.count({
      where: { meetingId },
    });
    if (existingCount >= MAX_FILES_PER_MEETING) {
      await unlink(file.path).catch(() => undefined);
      throw new ConflictException(
        `Meeting already has the maximum number of files (${MAX_FILES_PER_MEETING})`,
      );
    }

    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    return this.prisma.meetingFile.create({
      data: {
        meetingId,
        filename,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
      },
    });
  }
}
