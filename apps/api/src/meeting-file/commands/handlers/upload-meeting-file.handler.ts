import { unlink } from 'fs/promises';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MeetingFileTranscription } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StartMeetingFileTranscriptionCommand } from '../../../transcription/commands/impl/start-meeting-file-transcription.command';
import { TRANSCRIBABLE_MIME_TYPES } from '../../../transcription/transcription.constants';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILES_PER_MEETING,
} from '../../meeting-file.constants';
import { MeetingFileWithTranscription } from '../../meeting-file.types';
import { UploadMeetingFileCommand } from '../impl/upload-meeting-file.command';

@CommandHandler(UploadMeetingFileCommand)
export class UploadMeetingFileHandler implements ICommandHandler<
  UploadMeetingFileCommand,
  MeetingFileWithTranscription
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({
    meetingId,
    file,
    requesterId,
  }: UploadMeetingFileCommand): Promise<MeetingFileWithTranscription> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      await this.cleanupUpload(file.path);
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.organizerId !== requesterId) {
      await this.cleanupUpload(file.path);
      throw new ForbiddenException(
        'Only the meeting organizer can upload files to this meeting',
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      await this.cleanupUpload(file.path);
      throw new BadRequestException('Unsupported file type');
    }

    const existingCount = await this.prisma.meetingFile.count({
      where: { meetingId },
    });
    if (existingCount >= MAX_FILES_PER_MEETING) {
      await this.cleanupUpload(file.path);
      throw new ConflictException(
        `Meeting already has the maximum number of files (${MAX_FILES_PER_MEETING})`,
      );
    }

    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const meetingFile = await this.prisma.meetingFile.create({
      data: {
        meetingId,
        filename,
        size: file.size,
        mimeType: file.mimetype,
        storagePath: file.path,
      },
    });

    const transcription = await this.startTranscriptionIfSupported(
      meetingFile.id,
      meetingFile.mimeType,
      meetingFile.storagePath,
    );

    return { ...meetingFile, transcription };
  }

  private async startTranscriptionIfSupported(
    meetingFileId: string,
    mimeType: string,
    storagePath: string,
  ): Promise<MeetingFileTranscription | null> {
    if (!TRANSCRIBABLE_MIME_TYPES.includes(mimeType)) {
      return null;
    }

    return this.commandBus.execute<
      StartMeetingFileTranscriptionCommand,
      MeetingFileTranscription
    >(new StartMeetingFileTranscriptionCommand(meetingFileId, storagePath));
  }

  /** Удаляет загруженный multer-ом файл с диска перед отклонением загрузки. */
  private async cleanupUpload(filePath: string): Promise<void> {
    await unlink(filePath).catch(() => undefined);
  }
}
