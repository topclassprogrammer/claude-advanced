import { createHash, randomBytes } from 'crypto';

const RAW_TOKEN_BYTES = 32;

export function generateRawRefreshToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString('base64url');
}

/** В БД хранится только хеш — сырой токен нигде не персистится. */
export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
