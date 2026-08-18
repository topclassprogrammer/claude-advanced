import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Meeting } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetMeetingByIdQuery } from '../impl/get-meeting-by-id.query';

@QueryHandler(GetMeetingByIdQuery)
export class GetMeetingByIdHandler implements IQueryHandler<
  GetMeetingByIdQuery,
  Meeting
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ id, organizerId }: GetMeetingByIdQuery): Promise<Meeting> {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, organizerId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    return meeting;
  }
}
