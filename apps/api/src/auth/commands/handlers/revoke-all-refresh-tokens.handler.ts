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
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Закрывает grace period для всех цепочек пользователя целиком,
      // включая уже ротированные (revokedAt не null) строки — иначе
      // токен, ротированный незадолго до смены пароля/детекта кражи,
      // всё ещё мог бы выдать новый живой токен в обход этого отзыва.
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { familyRevokedAt: new Date() },
      }),
    ]);
  }
}
