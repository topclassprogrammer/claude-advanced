import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuthTokenService } from '../../auth-token.service';
import { RegisterCommand } from '../impl/register.command';
import { CreateUserCommand } from '../../../users/commands/impl/create-user.command';
import { UserRecord } from '../../../users/user.types';

export interface RegisterResult {
  accessToken: string;
  userId: string;
}

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<
  RegisterCommand,
  RegisterResult
> {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute({ email, password }: RegisterCommand): Promise<RegisterResult> {
    const user = await this.commandBus.execute<CreateUserCommand, UserRecord>(
      new CreateUserCommand(email, password),
    );

    const { accessToken } = this.authTokenService.sign(user.id, user.email);
    return { accessToken, userId: user.id };
  }
}
