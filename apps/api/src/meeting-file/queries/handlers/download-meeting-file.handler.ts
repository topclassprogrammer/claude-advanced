import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MeetingFile } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DownloadMeetingFileQuery } from '../impl/download-meeting-file.query';

@QueryHandler(DownloadMeetingFileQuery)
export class DownloadMeetingFileHandler implements IQueryHandler<
  DownloadMeetingFileQuery,
  MeetingFile
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ meetingId }: DownloadMeetingFileQuery): Promise<MeetingFile> {
    const file = await this.prisma.meetingFile.findUnique({
      where: { meetingId },
    });
    if (!file) {
      throw new NotFoundException('Meeting file not found');
    }

    return file;
  }
}
