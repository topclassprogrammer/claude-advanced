import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { RevokeAllRefreshTokensCommand } from '../impl/revoke-all-refresh-tokens.command';

@CommandHandler(RevokeAllRefreshTokensCommand)
export class RevokeAllRefreshTokensHandler implements ICommandHandler<
  RevokeAllRefreshTokensCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: RevokeAllRefreshTokensCommand): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
