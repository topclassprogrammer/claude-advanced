import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SummaryModule } from '../summary/summary.module';
import { ProcessMeetingFileTranscriptionHandler } from './commands/handlers/process-meeting-file-transcription.handler';
import { StartMeetingFileTranscriptionHandler } from './commands/handlers/start-meeting-file-transcription.handler';
import { LocalWhisperTranscriptionService } from './local-whisper-transcription.service';
import { WHISPER_TRANSCRIPTION_SERVICE } from './whisper-transcription.service';

const CommandHandlers = [
  StartMeetingFileTranscriptionHandler,
  ProcessMeetingFileTranscriptionHandler,
];

@Module({
  imports: [CqrsModule, SummaryModule],
  providers: [
    ...CommandHandlers,
    {
      provide: WHISPER_TRANSCRIPTION_SERVICE,
      useClass: LocalWhisperTranscriptionService,
    },
  ],
})
export class TranscriptionModule {}
