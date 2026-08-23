import type { BrowserContext } from '@playwright/test';

const COOKIE_DOMAIN = 'localhost';

/**
 * Сессия теперь двухтокенная: короткоживущий access-токен живёт только в
 * памяти вкладки (не сидируется), а долгоживущий refresh-токен — в httpOnly
 * куке, скоупленной на /auth (см. apps/api/src/auth/refresh-token-cookie.util.ts).
 * Тесты сидируют именно эту куку напрямую в контекст браузера, минуя реальный
 * login-флоу; дальше приложение само вызывает POST /auth/refresh при
 * монтировании (useSession) и восстанавливает access-токен в памяти.
 *
 * rawSetCookieHeader — сырое значение заголовка Set-Cookie из ответа
 * /auth/register или /auth/login (см. helpers/api.ts, RegisteredUser).
 */
export async function setSessionCookie(
  context: BrowserContext,
  rawSetCookieHeader: string,
): Promise<void> {
  const [nameValue] = rawSetCookieHeader.split(';');
  const separatorIndex = nameValue.indexOf('=');
  const name = nameValue.slice(0, separatorIndex).trim();
  const value = nameValue.slice(separatorIndex + 1).trim();

  await context.addCookies([
    {
      name,
      value,
      domain: COOKIE_DOMAIN,
      // apps/web (3000) и apps/api (3001) — один site для cookie-политики
      // браузера (domain без порта), поэтому кука долетает до API-запросов
      // с фронтенда несмотря на разные порты.
      path: '/auth',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
