import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MeetingFile } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetMeetingFilesQuery } from '../impl/get-meeting-files.query';

@QueryHandler(GetMeetingFilesQuery)
export class GetMeetingFilesHandler implements IQueryHandler<
  GetMeetingFilesQuery,
  MeetingFile[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ meetingId }: GetMeetingFilesQuery): Promise<MeetingFile[]> {
    return this.prisma.meetingFile.findMany({
      where: { meetingId },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
