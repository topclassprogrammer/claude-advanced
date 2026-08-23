import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChangePasswordCommand } from '../impl/change-password.command';

const PASSWORD_SALT_ROUNDS = 10;

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<
  ChangePasswordCommand,
  void
> {
  constructor(private readonly prisma: PrismaService) {}

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
  }
}
