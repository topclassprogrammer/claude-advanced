import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Meeting } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMeetingCommand } from '../impl/create-meeting.command';

@CommandHandler(CreateMeetingCommand)
export class CreateMeetingHandler implements ICommandHandler<
  CreateMeetingCommand,
  Meeting
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    organizerId,
    title,
    date,
    participants,
  }: CreateMeetingCommand): Promise<Meeting> {
    return this.prisma.meeting.create({
      data: { organizerId, title, date: new Date(date), participants },
    });
  }
}
