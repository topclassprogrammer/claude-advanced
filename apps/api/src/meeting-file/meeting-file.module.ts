import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { UploadMeetingFileHandler } from './commands/handlers/upload-meeting-file.handler';
import { MeetingFileController } from './meeting-file.controller';
import { DownloadMeetingFileHandler } from './queries/handlers/download-meeting-file.handler';

const CommandHandlers = [UploadMeetingFileHandler];
const QueryHandlers = [DownloadMeetingFileHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingFileController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingFileModule {}
