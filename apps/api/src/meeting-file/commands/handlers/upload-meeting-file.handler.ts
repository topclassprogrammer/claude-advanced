import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ConflictException,
  HttpException,
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
      await this.rejectUpload(
        file.path,
        new NotFoundException('Meeting not found'),
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      await this.rejectUpload(
        file.path,
        new BadRequestException('Unsupported file type'),
      );
    }

    const existingCount = await this.prisma.meetingFile.count({
      where: { meetingId },
    });
    if (existingCount >= MAX_FILES_PER_MEETING) {
      await this.rejectUpload(
        file.path,
        new ConflictException(
          `Meeting already has the maximum number of files (${MAX_FILES_PER_MEETING})`,
        ),
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

  /** Удаляет загруженный multer-ом файл с диска перед отклонением загрузки. */
  private async rejectUpload(
    filePath: string,
    exception: HttpException,
  ): Promise<never> {
    await unlink(filePath).catch(() => undefined);
    throw exception;
  }
}
