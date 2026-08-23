import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  MeetingFileTranscription,
  TranscriptionStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { WHISPER_TRANSCRIPTION_SERVICE } from '../../whisper-transcription.service';
import type { WhisperTranscriptionService } from '../../whisper-transcription.service';
import { ProcessMeetingFileTranscriptionCommand } from '../impl/process-meeting-file-transcription.command';

@CommandHandler(ProcessMeetingFileTranscriptionCommand)
export class ProcessMeetingFileTranscriptionHandler implements ICommandHandler<
  ProcessMeetingFileTranscriptionCommand,
  void
> {
  private readonly logger = new Logger(
    ProcessMeetingFileTranscriptionHandler.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    @Inject(WHISPER_TRANSCRIPTION_SERVICE)
    private readonly whisperTranscriptionService: WhisperTranscriptionService,
  ) {}

  async execute({
    meetingFileId,
    storagePath,
  }: ProcessMeetingFileTranscriptionCommand): Promise<void> {
    await this.setStatus(meetingFileId, TranscriptionStatus.PROCESSING);

    try {
      const text =
        await this.whisperTranscriptionService.transcribe(storagePath);
      await this.setStatus(meetingFileId, TranscriptionStatus.COMPLETED, {
        text,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transcription failed for meeting file ${meetingFileId}: ${errorMessage}`,
      );
      await this.setStatus(meetingFileId, TranscriptionStatus.FAILED, {
        errorMessage,
      });
    }
  }

  /**
   * updateMany (не update) — файл встречи мог быть удалён (каскадно снеся
   * транскрипт) конкурентно с ещё выполняющейся обработкой; в этом случае
   * обновлять нечего, и это не ошибка.
   */
  private async setStatus(
    meetingFileId: string,
    status: TranscriptionStatus,
    fields: Partial<
      Pick<MeetingFileTranscription, 'text' | 'errorMessage'>
    > = {},
  ): Promise<void> {
    await this.prisma.meetingFileTranscription.updateMany({
      where: { meetingFileId },
      data: { status, ...fields },
    });
  }
}
