import { unlink } from 'fs/promises';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ALLOWED_AVATAR_MIME_TYPES } from '../../profile.constants';
import { ProfileRecord, toProfileRecord } from '../../profile.types';
import { UploadAvatarCommand } from '../impl/upload-avatar.command';

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler implements ICommandHandler<
  UploadAvatarCommand,
  ProfileRecord
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId, file }: UploadAvatarCommand): Promise<ProfileRecord> {
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Unsupported file type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await unlink(file.path).catch(() => undefined);
      throw new NotFoundException('User not found');
    }

    const previousPath = user.avatarPath;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatarPath: file.path,
        avatarMimeType: file.mimetype,
        avatarUploadedAt: new Date(),
      },
    });

    if (previousPath) {
      await unlink(previousPath).catch(() => undefined);
    }

    return toProfileRecord(updated);
  }
}
