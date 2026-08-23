import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MeetingFileTranscription } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessMeetingFileTranscriptionCommand } from '../impl/process-meeting-file-transcription.command';
import { StartMeetingFileTranscriptionCommand } from '../impl/start-meeting-file-transcription.command';

@CommandHandler(StartMeetingFileTranscriptionCommand)
export class StartMeetingFileTranscriptionHandler implements ICommandHandler<
  StartMeetingFileTranscriptionCommand,
  MeetingFileTranscription
> {
  private readonly logger = new Logger(
    StartMeetingFileTranscriptionHandler.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({
    meetingFileId,
    storagePath,
  }: StartMeetingFileTranscriptionCommand): Promise<MeetingFileTranscription> {
    const transcription = await this.prisma.meetingFileTranscription.create({
      data: { meetingFileId },
    });

    void this.commandBus
      .execute(
        new ProcessMeetingFileTranscriptionCommand(meetingFileId, storagePath),
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to process transcription for meeting file ${meetingFileId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return transcription;
  }
}
