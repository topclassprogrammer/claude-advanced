import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcryptjs';
import { AuthTokenService } from '../../auth-token.service';
import { LoginQuery } from '../impl/login.query';
import { FindUserByEmailQuery } from '../../../users/queries/impl/find-user-by-email.query';
import { UserRecord } from '../../../users/user.types';

/**
 * Хеш без реального пользователя за ним — используется для сравнения по
 * постоянному времени, когда email не найден, чтобы ответ на невалидный
 * email нельзя было отличить по времени от ответа на неверный пароль
 * (user enumeration через timing).
 */
const DUMMY_PASSWORD_HASH =
  '$2a$10$CwTycUXWue0Thq9StjUM0uJ8i8zBHT0oXKGCEQjqIrCNXCLGKKrpe';

export interface LoginResult {
  accessToken: string;
  userId: string;
}

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<LoginQuery, LoginResult> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute({ email, password }: LoginQuery): Promise<LoginResult> {
    const user = await this.queryBus.execute<
      FindUserByEmailQuery,
      UserRecord | null
    >(new FindUserByEmailQuery(email));

    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken } = this.authTokenService.sign(user.id, user.email);
    return { accessToken, userId: user.id };
  }
}
