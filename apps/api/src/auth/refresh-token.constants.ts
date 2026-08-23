export const REFRESH_TOKEN_COOKIE = 'refreshToken';

const DEFAULT_REFRESH_TOKEN_TTL_DAYS = 30;

export function refreshTokenTtlMs(): number {
  const days = Number(
    process.env.REFRESH_TOKEN_TTL_DAYS ?? DEFAULT_REFRESH_TOKEN_TTL_DAYS,
  );
  const safeDays =
    Number.isFinite(days) && days > 0 ? days : DEFAULT_REFRESH_TOKEN_TTL_DAYS;
  return safeDays * 24 * 60 * 60 * 1000;
}
