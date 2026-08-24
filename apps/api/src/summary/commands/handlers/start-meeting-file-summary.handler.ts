import { Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Prisma } from '../../../../generated/prisma/client';
import { MeetingFileSummary } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessMeetingFileSummaryCommand } from '../impl/process-meeting-file-summary.command';
import { StartMeetingFileSummaryCommand } from '../impl/start-meeting-file-summary.command';

const FOREIGN_KEY_CONSTRAINT_FAILED = 'P2003';

@CommandHandler(StartMeetingFileSummaryCommand)
export class StartMeetingFileSummaryHandler implements ICommandHandler<
  StartMeetingFileSummaryCommand,
  MeetingFileSummary | null
> {
  private readonly logger = new Logger(StartMeetingFileSummaryHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({
    meetingFileId,
    transcriptText,
  }: StartMeetingFileSummaryCommand): Promise<MeetingFileSummary | null> {
    const summary = await this.createSummaryRecord(meetingFileId);
    if (!summary) {
      return null;
    }

    void this.commandBus
      .execute(
        new ProcessMeetingFileSummaryCommand(meetingFileId, transcriptText),
      )
      .catch((error: unknown) => {
        this.logger.error(
          `Failed to process summary for meeting file ${meetingFileId}`,
          error instanceof Error ? error.stack : String(error),
        );
      });

    return summary;
  }

  /**
   * Файл встречи мог быть удалён конкурентно между завершением
   * транскрибации и запуском выжимки — в этом случае create() бьётся в
   * FK-constraint, что не является ошибкой (файла для выжимки уже нет).
   */
  private async createSummaryRecord(
    meetingFileId: string,
  ): Promise<MeetingFileSummary | null> {
    try {
      return await this.prisma.meetingFileSummary.create({
        data: { meetingFileId },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === FOREIGN_KEY_CONSTRAINT_FAILED
      ) {
        return null;
      }
      throw error;
    }
  }
}
