import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { MeetingFileWithTranscription } from '../../meeting-file.types';
import { GetMeetingFilesQuery } from '../impl/get-meeting-files.query';

@QueryHandler(GetMeetingFilesQuery)
export class GetMeetingFilesHandler implements IQueryHandler<
  GetMeetingFilesQuery,
  MeetingFileWithTranscription[]
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    meetingId,
    requesterId,
  }: GetMeetingFilesQuery): Promise<MeetingFileWithTranscription[]> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }
    if (meeting.organizerId !== requesterId) {
      throw new ForbiddenException(
        'Only the meeting organizer can view its files',
      );
    }

    return this.prisma.meetingFile.findMany({
      where: { meetingId },
      orderBy: { uploadedAt: 'desc' },
      include: { transcription: true },
    });
  }
}
