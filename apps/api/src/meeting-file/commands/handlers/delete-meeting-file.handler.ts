import { unlink } from 'fs/promises';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteMeetingFileCommand } from '../impl/delete-meeting-file.command';

@CommandHandler(DeleteMeetingFileCommand)
export class DeleteMeetingFileHandler implements ICommandHandler<
  DeleteMeetingFileCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    meetingId,
    requesterId,
  }: DeleteMeetingFileCommand): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.organizerId !== requesterId) {
      throw new ForbiddenException(
        'Only the meeting organizer can delete the file',
      );
    }

    const file = await this.prisma.meetingFile.findUnique({
      where: { meetingId },
    });
    if (!file) {
      throw new NotFoundException('Meeting file not found');
    }

    await this.prisma.meetingFile.delete({ where: { meetingId } });
    await unlink(file.storagePath).catch(() => undefined);
  }
}
