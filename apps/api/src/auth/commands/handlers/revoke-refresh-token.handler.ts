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
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(rawToken) },
      select: { familyId: true },
    });
    if (!existing) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Закрывает grace period для всей цепочки, включая уже ротированные
      // (revokedAt не null) строки — иначе токен, ротированный за
      // последние REUSE_GRACE_PERIOD_MS до logout, всё ещё мог бы выдать
      // новый живой токен в обход только что выполненного выхода.
      this.prisma.refreshToken.updateMany({
        where: { familyId: existing.familyId },
        data: { familyRevokedAt: new Date() },
      }),
    ]);
  }
}
