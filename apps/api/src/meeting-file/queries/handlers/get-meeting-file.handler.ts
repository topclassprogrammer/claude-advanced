import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MeetingFile } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetMeetingFileQuery } from '../impl/get-meeting-file.query';

@QueryHandler(GetMeetingFileQuery)
export class GetMeetingFileHandler implements IQueryHandler<
  GetMeetingFileQuery,
  MeetingFile
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ meetingId }: GetMeetingFileQuery): Promise<MeetingFile> {
    const file = await this.prisma.meetingFile.findUnique({
      where: { meetingId },
    });
    if (!file) {
      throw new NotFoundException('Meeting file not found');
    }

    return file;
  }
}
