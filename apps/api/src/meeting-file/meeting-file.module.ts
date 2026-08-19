import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { DeleteMeetingFileHandler } from './commands/handlers/delete-meeting-file.handler';
import { UploadMeetingFileHandler } from './commands/handlers/upload-meeting-file.handler';
import { MeetingFileController } from './meeting-file.controller';
import { DownloadMeetingFileHandler } from './queries/handlers/download-meeting-file.handler';
import { GetMeetingFileHandler } from './queries/handlers/get-meeting-file.handler';

const CommandHandlers = [UploadMeetingFileHandler, DeleteMeetingFileHandler];
const QueryHandlers = [DownloadMeetingFileHandler, GetMeetingFileHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingFileController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingFileModule {}
