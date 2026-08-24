import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  MeetingFileTranscription,
  TranscriptionStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StartMeetingFileSummaryCommand } from '../../../summary/commands/impl/start-meeting-file-summary.command';
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
    private readonly commandBus: CommandBus,
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
      const { count } = await this.setStatus(
        meetingFileId,
        TranscriptionStatus.COMPLETED,
        { text },
      );
      if (count > 0) {
        await this.startSummaryGeneration(meetingFileId, text);
      }
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

  /** Не блокирует ответ обработчика — как и сама транскрибация, идёт в фоне. */
  private async startSummaryGeneration(
    meetingFileId: string,
    transcriptText: string,
  ): Promise<void> {
    await this.commandBus
      .execute(
        new StartMeetingFileSummaryCommand(meetingFileId, transcriptText),
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to start summary generation for meeting file ${meetingFileId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });
  }

  /**
   * updateMany (не update) — файл встречи мог быть удалён (каскадно снеся
   * транскрипт) конкурентно с ещё выполняющейся обработкой; в этом случае
   * обновлять нечего, и это не ошибка. Возвращает count, чтобы вызывающий
   * код мог не запускать генерацию выжимки для уже удалённого файла.
   */
  private async setStatus(
    meetingFileId: string,
    status: TranscriptionStatus,
    fields: Partial<
      Pick<MeetingFileTranscription, 'text' | 'errorMessage'>
    > = {},
  ): Promise<{ count: number }> {
    return this.prisma.meetingFileTranscription.updateMany({
      where: { meetingFileId },
      data: { status, ...fields },
    });
  }
}
