const TOKEN_KEY = 'accessToken';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Читает email из payload JWT без проверки подписи — только для отображения в UI. */
export function getEmailFromToken(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { email } = JSON.parse(decoded) as { email?: unknown };
    return typeof email === 'string' ? email : null;
  } catch {
    return null;
  }
}

/** Читает id пользователя (sub) из payload JWT без проверки подписи — только для UI-логики (например, определения организатора). */
export function getUserIdFromToken(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;

  try {
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { sub } = JSON.parse(decoded) as { sub?: unknown };
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
