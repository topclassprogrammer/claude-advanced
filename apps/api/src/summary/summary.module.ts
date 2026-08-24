import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AnthropicSummaryService } from './anthropic-summary.service';
import { CLAUDE_SUMMARY_SERVICE } from './claude-summary.service';
import { ProcessMeetingFileSummaryHandler } from './commands/handlers/process-meeting-file-summary.handler';
import { StartMeetingFileSummaryHandler } from './commands/handlers/start-meeting-file-summary.handler';

const CommandHandlers = [
  StartMeetingFileSummaryHandler,
  ProcessMeetingFileSummaryHandler,
];

@Module({
  imports: [CqrsModule],
  providers: [
    ...CommandHandlers,
    {
      provide: CLAUDE_SUMMARY_SERVICE,
      useClass: AnthropicSummaryService,
    },
  ],
})
export class SummaryModule {}
