import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  MeetingFileSummary,
  SummaryStatus,
} from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CLAUDE_SUMMARY_SERVICE } from '../../claude-summary.service';
import type {
  ClaudeSummaryService,
  GeneratedSummary,
} from '../../claude-summary.service';
import { ProcessMeetingFileSummaryCommand } from '../impl/process-meeting-file-summary.command';

@CommandHandler(ProcessMeetingFileSummaryCommand)
export class ProcessMeetingFileSummaryHandler implements ICommandHandler<
  ProcessMeetingFileSummaryCommand,
  void
> {
  private readonly logger = new Logger(ProcessMeetingFileSummaryHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLAUDE_SUMMARY_SERVICE)
    private readonly claudeSummaryService: ClaudeSummaryService,
  ) {}

  async execute({
    meetingFileId,
    transcriptText,
  }: ProcessMeetingFileSummaryCommand): Promise<void> {
    await this.setStatus(meetingFileId, SummaryStatus.PROCESSING);

    try {
      const generated =
        await this.claudeSummaryService.generateSummary(transcriptText);
      await this.saveGeneratedSummary(meetingFileId, generated);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Summary generation failed for meeting file ${meetingFileId}: ${errorMessage}`,
      );
      await this.setStatus(meetingFileId, SummaryStatus.FAILED, {
        errorMessage,
      });
    }
  }

  /**
   * updateMany + повторный findUnique (не update) — файл встречи мог быть
   * удалён (каскадно снеся выжимку) конкурентно с ещё выполняющейся
   * обработкой; в этом случае сохранять action items уже некуда.
   */
  private async saveGeneratedSummary(
    meetingFileId: string,
    generated: GeneratedSummary,
  ): Promise<void> {
    const { count } = await this.prisma.meetingFileSummary.updateMany({
      where: { meetingFileId },
      data: {
        status: SummaryStatus.COMPLETED,
        summary: generated.summary,
        decisions: generated.decisions,
      },
    });
    if (count === 0 || generated.actionItems.length === 0) {
      return;
    }

    const summaryRecord = await this.prisma.meetingFileSummary.findUnique({
      where: { meetingFileId },
    });
    if (!summaryRecord) {
      return;
    }

    await this.prisma.summaryActionItem.createMany({
      data: generated.actionItems.map((item) => ({
        meetingFileSummaryId: summaryRecord.id,
        text: item.text,
        assignee: item.assignee,
      })),
    });
  }

  private async setStatus(
    meetingFileId: string,
    status: SummaryStatus,
    fields: Partial<Pick<MeetingFileSummary, 'errorMessage'>> = {},
  ): Promise<void> {
    await this.prisma.meetingFileSummary.updateMany({
      where: { meetingFileId },
      data: { status, ...fields },
    });
  }
}
