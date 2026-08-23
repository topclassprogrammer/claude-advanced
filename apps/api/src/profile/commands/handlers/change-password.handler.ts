import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { RevokeAllRefreshTokensCommand } from '../../../auth/commands/impl/revoke-all-refresh-tokens.command';
import { ChangePasswordCommand } from '../impl/change-password.command';

const PASSWORD_SALT_ROUNDS = 10;

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<
  ChangePasswordCommand,
  void
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute({
    userId,
    oldPassword,
    newPassword,
  }: ChangePasswordCommand): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });

    // Помимо инвалидации уже выданных access-токенов (passwordChangedAt,
    // проверяется в JwtAuthGuard) отзываем всю цепочку refresh-токенов —
    // иначе украденный до смены пароля refresh-токен продолжил бы молча
    // выписывать новые access-токены после смены пароля.
    await this.commandBus.execute(new RevokeAllRefreshTokensCommand(userId));
  }
}
