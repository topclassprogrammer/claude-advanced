import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashRefreshToken } from '../../refresh-token.util';
import { RevokeRefreshTokenCommand } from '../impl/revoke-refresh-token.command';

@CommandHandler(RevokeRefreshTokenCommand)
export class RevokeRefreshTokenHandler implements ICommandHandler<
  RevokeRefreshTokenCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ rawToken }: RevokeRefreshTokenCommand): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hashRefreshToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
