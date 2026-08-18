import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/jwt-auth.guard';
import { CreateMeetingCommand } from './commands/impl/create-meeting.command';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { GetMeetingByIdQuery } from './queries/impl/get-meeting-by-id.query';
import { GetMeetingsQuery } from './queries/impl/get-meetings.query';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.commandBus.execute(
      new CreateMeetingCommand(user.sub, dto.title, dto.date, dto.participants),
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.queryBus.execute(new GetMeetingsQuery(user.sub));
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.queryBus.execute(new GetMeetingByIdQuery(id, user.sub));
  }
}
