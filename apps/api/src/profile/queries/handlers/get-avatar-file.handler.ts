import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetAvatarFileQuery } from '../impl/get-avatar-file.query';

export interface AvatarFile {
  path: string;
  mimeType: string;
}

@QueryHandler(GetAvatarFileQuery)
export class GetAvatarFileHandler implements IQueryHandler<
  GetAvatarFileQuery,
  AvatarFile
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: GetAvatarFileQuery): Promise<AvatarFile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.avatarPath || !user.avatarMimeType) {
      throw new NotFoundException('Avatar not found');
    }

    return { path: user.avatarPath, mimeType: user.avatarMimeType };
  }
}
