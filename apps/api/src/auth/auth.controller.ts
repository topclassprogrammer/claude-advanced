import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import { RegisterCommand } from './commands/impl/register.command';
import { LoginQuery } from './queries/impl/login.query';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 5 } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  register(@Body() dto: RegisterDto) {
    return this.commandBus.execute(
      new RegisterCommand(dto.email, dto.password),
    );
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  login(@Body() dto: LoginDto) {
    return this.queryBus.execute(new LoginQuery(dto.email, dto.password));
  }
}
