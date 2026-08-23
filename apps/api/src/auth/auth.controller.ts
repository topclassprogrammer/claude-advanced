import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { RegisterCommand } from './commands/impl/register.command';
import type { RegisterResult } from './commands/handlers/register.handler';
import { LoginQuery } from './queries/impl/login.query';
import type { LoginResult } from './queries/handlers/login.handler';
import { IssueRefreshTokenCommand } from './commands/impl/issue-refresh-token.command';
import { RotateRefreshTokenCommand } from './commands/impl/rotate-refresh-token.command';
import type { RotatedTokens } from './commands/handlers/rotate-refresh-token.handler';
import { RevokeRefreshTokenCommand } from './commands/impl/revoke-refresh-token.command';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  REFRESH_TOKEN_COOKIE,
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from './refresh-token-cookie.util';
import { CurrentUser } from './current-user.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthenticatedUser } from './jwt-auth.guard';

const AUTH_THROTTLE = { default: { ttl: 60_000, limit: 5 } };
/**
 * /auth/refresh легитимно вызывается автоматически (bootstrap сессии на
 * каждой загрузке страницы, silent refresh при истечении access-токена,
 * несколько вкладок) — лимит выше, чем у login/register, но всё ещё
 * ограничивает злоупотребление (сам refresh-токен угадать нельзя).
 */
const REFRESH_THROTTLE = { default: { ttl: 60_000, limit: 20 } };

function readRefreshTokenCookie(req: Request): string | undefined {
  return (req.cookies as Record<string, string> | undefined)?.[
    REFRESH_TOKEN_COOKIE
  ];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('register')
  @Throttle(AUTH_THROTTLE)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const result = await this.commandBus.execute<
      RegisterCommand,
      RegisterResult
    >(new RegisterCommand(dto.email, dto.password));
    await this.issueRefreshTokenCookie(res, result.userId);
    return { accessToken: result.accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const result = await this.queryBus.execute<LoginQuery, LoginResult>(
      new LoginQuery(dto.email, dto.password),
    );
    await this.issueRefreshTokenCookie(res, result.userId);
    return { accessToken: result.accessToken };
  }

  /** Обменивает refresh-куку на новый access-токен и ротирует refresh-токен. */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle(REFRESH_THROTTLE)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const rawToken = readRefreshTokenCookie(req);
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { accessToken, rawRefreshToken } = await this.commandBus.execute<
      RotateRefreshTokenCommand,
      RotatedTokens
    >(new RotateRefreshTokenCommand(rawToken));
    setRefreshTokenCookie(res, rawRefreshToken);
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawToken = readRefreshTokenCookie(req);
    if (rawToken) {
      await this.commandBus.execute(new RevokeRefreshTokenCommand(rawToken));
    }
    clearRefreshTokenCookie(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private async issueRefreshTokenCookie(
    res: Response,
    userId: string,
  ): Promise<void> {
    const rawToken = await this.commandBus.execute<
      IssueRefreshTokenCommand,
      string
    >(new IssueRefreshTokenCommand(userId));
    setRefreshTokenCookie(res, rawToken);
  }
}
