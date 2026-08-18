import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from '../auth/auth.module';
import { MeetingController } from './meeting.controller';
import { CreateMeetingHandler } from './commands/handlers/create-meeting.handler';
import { GetMeetingsHandler } from './queries/handlers/get-meetings.handler';
import { GetMeetingByIdHandler } from './queries/handlers/get-meeting-by-id.handler';

const CommandHandlers = [CreateMeetingHandler];
const QueryHandlers = [GetMeetingsHandler, GetMeetingByIdHandler];

@Module({
  imports: [CqrsModule, AuthModule],
  controllers: [MeetingController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class MeetingModule {}
