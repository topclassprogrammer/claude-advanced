import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateProfileNameCommand } from '../impl/update-profile-name.command';
import { ProfileRecord, toProfileRecord } from '../../profile.types';

@CommandHandler(UpdateProfileNameCommand)
export class UpdateProfileNameHandler implements ICommandHandler<
  UpdateProfileNameCommand,
  ProfileRecord
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    userId,
    name,
  }: UpdateProfileNameCommand): Promise<ProfileRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });

    return toProfileRecord(updated);
  }
}
