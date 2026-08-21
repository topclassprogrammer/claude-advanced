import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetProfileQuery } from '../impl/get-profile.query';
import { ProfileRecord, toProfileRecord } from '../../profile.types';

@QueryHandler(GetProfileQuery)
export class GetProfileHandler implements IQueryHandler<
  GetProfileQuery,
  ProfileRecord
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: GetProfileQuery): Promise<ProfileRecord> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return toProfileRecord(user);
  }
}
