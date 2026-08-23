import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { refreshTokenTtlMs } from '../../refresh-token.constants';
import {
  generateRawRefreshToken,
  hashRefreshToken,
} from '../../refresh-token.util';
import { IssueRefreshTokenCommand } from '../impl/issue-refresh-token.command';

@CommandHandler(IssueRefreshTokenCommand)
export class IssueRefreshTokenHandler implements ICommandHandler<
  IssueRefreshTokenCommand,
  string
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ userId }: IssueRefreshTokenCommand): Promise<string> {
    const rawToken = generateRawRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hashRefreshToken(rawToken),
        expiresAt: new Date(Date.now() + refreshTokenTtlMs()),
      },
    });

    return rawToken;
  }
}
