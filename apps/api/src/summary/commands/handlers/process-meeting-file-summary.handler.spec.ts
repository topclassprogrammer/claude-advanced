import {
  ClaudeSummaryService,
  GeneratedSummary,
} from '../../claude-summary.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProcessMeetingFileSummaryCommand } from '../impl/process-meeting-file-summary.command';
import { ProcessMeetingFileSummaryHandler } from './process-meeting-file-summary.handler';

const GENERATED: GeneratedSummary = {
  summary: 'Discussed the roadmap.',
  actionItems: [{ text: 'Prepare the deck', assignee: 'Alice' }],
  decisions: ['Ship in Q3'],
};

describe('ProcessMeetingFileSummaryHandler', () => {
  let handler: ProcessMeetingFileSummaryHandler;
  let prisma: {
    meetingFileSummary: { updateMany: jest.Mock; findUnique: jest.Mock };
    summaryActionItem: { deleteMany: jest.Mock; createMany: jest.Mock };
  };
  let claudeSummaryService: jest.Mocked<ClaudeSummaryService>;

  beforeEach(() => {
    prisma = {
      meetingFileSummary: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue({ id: 'summary-1' }),
      },
      summaryActionItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    claudeSummaryService = {
      generateSummary: jest.fn().mockResolvedValue(GENERATED),
    };
    handler = new ProcessMeetingFileSummaryHandler(
      prisma as unknown as PrismaService,
      claudeSummaryService,
    );
  });

  it('sets PROCESSING, then persists COMPLETED with action items replaced idempotently', async () => {
    await handler.execute(
      new ProcessMeetingFileSummaryCommand('file-1', 'transcript'),
    );

    expect(prisma.meetingFileSummary.updateMany).toHaveBeenNthCalledWith(1, {
      where: { meetingFileId: 'file-1' },
      data: { status: 'PROCESSING' },
    });
    expect(prisma.meetingFileSummary.updateMany).toHaveBeenNthCalledWith(2, {
      where: { meetingFileId: 'file-1' },
      data: {
        status: 'COMPLETED',
        summary: GENERATED.summary,
        decisions: GENERATED.decisions,
      },
    });
    expect(prisma.summaryActionItem.deleteMany).toHaveBeenCalledWith({
      where: { meetingFileSummaryId: 'summary-1' },
    });
    expect(prisma.summaryActionItem.createMany).toHaveBeenCalledWith({
      data: [
        {
          meetingFileSummaryId: 'summary-1',
          text: 'Prepare the deck',
          assignee: 'Alice',
        },
      ],
    });
  });

  it('does not touch action items when there are none to save', async () => {
    claudeSummaryService.generateSummary.mockResolvedValue({
      summary: 'Quick sync.',
      actionItems: [],
      decisions: [],
    });

    await handler.execute(
      new ProcessMeetingFileSummaryCommand('file-1', 'transcript'),
    );

    expect(prisma.summaryActionItem.deleteMany).toHaveBeenCalledWith({
      where: { meetingFileSummaryId: 'summary-1' },
    });
    expect(prisma.summaryActionItem.createMany).not.toHaveBeenCalled();
  });

  it('skips saving action items when the meeting file was deleted before COMPLETED could be written', async () => {
    prisma.meetingFileSummary.updateMany
      .mockResolvedValueOnce({ count: 1 }) // PROCESSING
      .mockResolvedValueOnce({ count: 0 }); // COMPLETED — no row left

    await handler.execute(
      new ProcessMeetingFileSummaryCommand('file-1', 'transcript'),
    );

    expect(prisma.meetingFileSummary.findUnique).not.toHaveBeenCalled();
    expect(prisma.summaryActionItem.createMany).not.toHaveBeenCalled();
  });

  it('skips saving action items when the summary row disappears between updateMany and findUnique', async () => {
    prisma.meetingFileSummary.findUnique.mockResolvedValue(null);

    await handler.execute(
      new ProcessMeetingFileSummaryCommand('file-1', 'transcript'),
    );

    expect(prisma.summaryActionItem.deleteMany).not.toHaveBeenCalled();
    expect(prisma.summaryActionItem.createMany).not.toHaveBeenCalled();
  });

  it('sets FAILED with the error message when Claude generation fails', async () => {
    claudeSummaryService.generateSummary.mockRejectedValue(
      new Error('rate limited'),
    );

    await handler.execute(
      new ProcessMeetingFileSummaryCommand('file-1', 'transcript'),
    );

    expect(prisma.meetingFileSummary.updateMany).toHaveBeenNthCalledWith(2, {
      where: { meetingFileId: 'file-1' },
      data: { status: 'FAILED', errorMessage: 'rate limited' },
    });
    expect(prisma.summaryActionItem.createMany).not.toHaveBeenCalled();
  });
});
