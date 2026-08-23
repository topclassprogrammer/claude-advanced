import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { TranscriptionModule } from '../transcription/transcription.module';
import { DeleteMeetingFileHandler } from './commands/handlers/delete-meeting-file.handler';
import { UploadMeetingFileHandler } from './commands/handlers/upload-meeting-file.handler';
import { MeetingFileController } from './meeting-file.controller';
import { DownloadMeetingFileHandler } from './queries/handlers/download-meeting-file.handler';
import { GetMeetingFilesHandler } from './queries/handlers/get-meeting-files.handler';

const CommandHandlers = [UploadMeetingFileHandler, DeleteMeetingFileHandler];
const QueryHandlers = [DownloadMeetingFileHandler, GetMeetingFilesHandler];

@Module({
  imports: [CqrsModule, AuthModule, TranscriptionModule],
  controllers: [MeetingFileController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingFileModule {}
