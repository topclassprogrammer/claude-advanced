import { randomUUID } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthTokenService } from '../../auth-token.service';
import { refreshTokenTtlMs } from '../../refresh-token.constants';
import {
  generateRawRefreshToken,
  hashRefreshToken,
} from '../../refresh-token.util';
import { RotateRefreshTokenCommand } from '../impl/rotate-refresh-token.command';

/**
 * Токен, ротированный менее чем REUSE_GRACE_PERIOD_MS назад, при повторном
 * предъявлении не считается кражей — типичная гонка нескольких вкладок или
 * повторного запроса, ротировавших один и тот же refresh-токен почти
 * одновременно (Set-Cookie одной вкладки ещё не долетел до другой).
 * Применяется только к отзыву через ротацию (replacedByTokenId заполнен) —
 * явный отзыв (logout, смена пароля, детект кражи) им не прикрывается.
 */
const REUSE_GRACE_PERIOD_MS = 10_000;

export interface RotatedTokens {
  accessToken: string;
  rawRefreshToken: string;
}

@CommandHandler(RotateRefreshTokenCommand)
export class RotateRefreshTokenHandler implements ICommandHandler<
  RotateRefreshTokenCommand,
  RotatedTokens
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute({
    rawToken,
  }: RotateRefreshTokenCommand): Promise<RotatedTokens> {
    const tokenHash = hashRefreshToken(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (existing.revokedAt) {
      const wasRevokedByRotation = existing.replacedByTokenId !== null;
      // Явный отзыв (logout/смена пароля/предыдущий детект кражи) ставит
      // familyRevokedAt разом на всю цепочку — как только он выставлен,
      // grace period для неё закрыт навсегда, даже если конкретно этот
      // токен ротировался только что.
      const familyIntact = existing.familyRevokedAt === null;
      const withinGracePeriod =
        wasRevokedByRotation &&
        familyIntact &&
        Date.now() - existing.revokedAt.getTime() < REUSE_GRACE_PERIOD_MS;
      if (!withinGracePeriod) {
        // Либо явно отозван, либо ротирован давно и всё равно
        // предъявляется — похоже на кражу (скопированная кука и т.п.).
        // Отзываем всю цепочку токенов пользователя, вынуждая
        // перелогиниться на всех устройствах.
        await this.revokeAllFamiliesOfUser(existing.userId);
        throw new UnauthorizedException('Refresh token reuse detected');
      }

      // Токен уже отозван предыдущей ротацией — это толерантный повтор
      // (гонка вкладок), отзывать заново нечего, просто выдаём ещё один
      // валидный дочерний токен от той же цепочки.
      return this.mintChildToken(
        existing.userId,
        existing.user.email,
        existing.familyId,
      );
    }

    return this.rotate(
      existing.id,
      existing.userId,
      existing.user.email,
      existing.familyId,
    );
  }

  private async revokeAllFamiliesOfUser(userId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Закрывает grace period для всех цепочек пользователя целиком,
      // включая уже ротированные (revokedAt не null) строки.
      this.prisma.refreshToken.updateMany({
        where: { userId },
        data: { familyRevokedAt: new Date() },
      }),
    ]);
  }

  private async rotate(
    currentTokenId: string,
    userId: string,
    email: string,
    familyId: string,
  ): Promise<RotatedTokens> {
    const rawRefreshToken = generateRawRefreshToken();
    const newTokenId = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      // Отзываем старый токен первым и проверяем, что это именно мы его
      // отозвали (count === 0 означает, что параллельный запрос уже успел
      // ротировать этот же токен) — иначе одна украденная/скопированная
      // кука может форкнуться в две независимые живые цепочки токенов,
      // невидимые для reuse-detection.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: currentTokenId, revokedAt: null },
        data: { revokedAt: new Date(), replacedByTokenId: newTokenId },
      });
      if (count === 0) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await tx.refreshToken.create({
        data: {
          id: newTokenId,
          userId,
          tokenHash: hashRefreshToken(rawRefreshToken),
          expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
          familyId,
        },
      });
    });

    const { accessToken } = this.authTokenService.sign(userId, email);
    return { accessToken, rawRefreshToken };
  }

  private async mintChildToken(
    userId: string,
    email: string,
    familyId: string,
  ): Promise<RotatedTokens> {
    const rawRefreshToken = generateRawRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        id: randomUUID(),
        userId,
        tokenHash: hashRefreshToken(rawRefreshToken),
        expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
        familyId,
      },
    });

    const { accessToken } = this.authTokenService.sign(userId, email);
    return { accessToken, rawRefreshToken };
  }
}
