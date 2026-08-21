import { unlink } from 'fs/promises';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { DeleteAvatarCommand } from '../impl/delete-avatar.command';

@CommandHandler(DeleteAvatarCommand)
export class DeleteAvatarHandler implements ICommandHandler<
  DeleteAvatarCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: DeleteAvatarCommand): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.avatarPath) {
      await unlink(user.avatarPath).catch(() => undefined);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarPath: null, avatarMimeType: null, avatarUploadedAt: null },
    });
  }
}
