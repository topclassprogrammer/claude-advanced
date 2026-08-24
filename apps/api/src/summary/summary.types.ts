import {
  MeetingFileSummary,
  SummaryActionItem,
  SummaryStatus,
} from '../../generated/prisma/client';

export type MeetingFileSummaryWithActionItems = MeetingFileSummary & {
  actionItems: SummaryActionItem[];
};

export interface MeetingFileActionItemRecord {
  text: string;
  assignee: string | null;
}

/** Публичное представление выжимки — без errorMessage (диагностика). */
export interface MeetingFileSummaryRecord {
  status: SummaryStatus;
  summary: string | null;
  actionItems: MeetingFileActionItemRecord[];
  decisions: string[];
}

export function toMeetingFileSummaryRecord(
  summary: MeetingFileSummaryWithActionItems,
): MeetingFileSummaryRecord {
  return {
    status: summary.status,
    summary: summary.summary,
    actionItems: summary.actionItems.map((item) => ({
      text: item.text,
      assignee: item.assignee,
    })),
    decisions: summary.decisions,
  };
}
