export const CLAUDE_SUMMARY_SERVICE = Symbol('CLAUDE_SUMMARY_SERVICE');

export interface GeneratedActionItem {
  text: string;
  assignee: string | null;
}

export interface GeneratedSummary {
  summary: string;
  actionItems: GeneratedActionItem[];
  decisions: string[];
}

export interface ClaudeSummaryService {
  generateSummary(transcriptText: string): Promise<GeneratedSummary>;
}
