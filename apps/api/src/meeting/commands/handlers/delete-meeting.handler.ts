import { unlink } from 'fs/promises';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteMeetingCommand } from '../impl/delete-meeting.command';

@CommandHandler(DeleteMeetingCommand)
export class DeleteMeetingHandler implements ICommandHandler<
  DeleteMeetingCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    meetingId,
    requesterId,
  }: DeleteMeetingCommand): Promise<void> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { files: true },
    });
    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    if (meeting.organizerId !== requesterId) {
      throw new ForbiddenException(
        'Only the meeting organizer can delete the meeting',
      );
    }

    await this.prisma.meeting.delete({ where: { id: meetingId } });
    await Promise.all(
      meeting.files.map((file) =>
        unlink(file.storagePath).catch(() => undefined),
      ),
    );
  }
}
