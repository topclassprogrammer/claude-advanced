import { CookieOptions, Response } from 'express';
import { isProductionLikeEnv } from '../config/env.util';
import {
  REFRESH_TOKEN_COOKIE,
  refreshTokenTtlMs,
} from './refresh-token.constants';

export { REFRESH_TOKEN_COOKIE };

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // Fail-closed: Secure выключен только при явном NODE_ENV=development/test.
    secure: isProductionLikeEnv(),
    // Кука нужна только эндпоинтам ротации/логаута — незачем отправлять её
    // на каждый обычный запрос к API (access-токен теперь только в
    // заголовке Authorization, не в куке).
    path: '/auth',
  };
}

export function setRefreshTokenCookie(res: Response, rawToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, rawToken, {
    ...baseCookieOptions(),
    maxAge: refreshTokenTtlMs(),
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, baseCookieOptions());
}
