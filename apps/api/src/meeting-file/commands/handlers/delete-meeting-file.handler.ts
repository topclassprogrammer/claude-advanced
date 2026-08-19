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
    fileId,
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
        'Only the meeting organizer can delete files',
      );
    }

    const file = await this.prisma.meetingFile.findUnique({
      where: { id: fileId },
    });
    if (!file || file.meetingId !== meetingId) {
      throw new NotFoundException('Meeting file not found');
    }

    await this.prisma.meetingFile.delete({ where: { id: fileId } });
    await unlink(file.storagePath).catch(() => undefined);
  }
}
