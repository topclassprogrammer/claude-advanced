import { UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcryptjs';
import { AuthTokenService } from '../../auth-token.service';
import { LoginQuery } from '../impl/login.query';
import { FindUserByEmailQuery } from '../../../users/queries/impl/find-user-by-email.query';
import { UserRecord } from '../../../users/user.types';

@QueryHandler(LoginQuery)
export class LoginHandler implements IQueryHandler<
  LoginQuery,
  { accessToken: string }
> {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async execute({
    email,
    password,
  }: LoginQuery): Promise<{ accessToken: string }> {
    const user = await this.queryBus.execute<
      FindUserByEmailQuery,
      UserRecord | null
    >(new FindUserByEmailQuery(email));
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.authTokenService.sign(user.id, user.email);
  }
}
