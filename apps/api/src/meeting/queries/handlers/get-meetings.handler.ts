import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Meeting } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetMeetingsQuery } from '../impl/get-meetings.query';

@QueryHandler(GetMeetingsQuery)
export class GetMeetingsHandler implements IQueryHandler<
  GetMeetingsQuery,
  Meeting[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ organizerId }: GetMeetingsQuery): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({ where: { organizerId } });
  }
}
