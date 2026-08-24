const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type CurrentUser = { sub: string; email: string };

/**
 * Access-токен живёт только в памяти этого модуля — не в localStorage и не
 * в куке. Пропадает при полной перезагрузке страницы, поэтому на bootstrap
 * сессии (useSession) сначала вызывается refreshAccessToken(), которая
 * восстанавливает его по httpOnly refresh-куке (см. apps/api/CLAUDE.md).
 */
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null): void {
  accessToken = token;
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось зарегистрироваться'),
      res.status,
    );
  }

  setAccessToken((body as { accessToken: string }).accessToken);
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось войти'),
      res.status,
    );
  }

  setAccessToken((body as { accessToken: string }).accessToken);
}

/** Очищает refresh-куку на бэкенде (POST /auth/logout) и локальный access-токен. */
export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  setAccessToken(null);
}

/**
 * Обменивает httpOnly refresh-куку на новый access-токен (POST /auth/refresh)
 * и сохраняет его в памяти. Возвращает null, если куки нет/она невалидна —
 * вызывающий код (useSession, authorizedFetch) в этом случае считает
 * пользователя неавторизованным.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    setAccessToken(null);
    return null;
  }

  const body = (await res.json()) as { accessToken: string };
  setAccessToken(body.accessToken);
  return body.accessToken;
}

/**
 * Дедуплицирует конкурентные silent-refresh — несколько почти одновременных
 * вызовов (несколько 401 в authorizedFetch, либо React StrictMode дважды
 * монтирующий useSession в dev) должны обменять refresh-куку только один
 * раз: одновременные POST /auth/refresh с одним и тем же (ещё не
 * ротированным на момент отправки) токеном упираются в race конкурентной
 * ротации на бэкенде и второй запрос получает 401 вместо толерантного
 * grace-period (см. apps/api/CLAUDE.md, «Аутентификация» — grace period
 * покрывает только повторное предъявление уже ротированного токена, не
 * гонку двух ротаций одного и того же токена).
 */
export function dedupedRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * fetch к apps/api с автоматическим Authorization: Bearer <accessToken> из
 * памяти. При 401 (истёкший access-токен) один раз молча обновляет его через
 * refreshAccessToken() и повторяет запрос — если и это не помогло, отдаёт
 * исходный 401-ответ вызывающему коду как есть.
 */
export async function authorizedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const attempt = async (): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(`${API_URL}${path}`, { ...init, headers });
  };

  const res = await attempt();
  if (res.status !== 401) return res;

  const refreshed = await dedupedRefresh();
  if (!refreshed) return res;

  return attempt();
}

/** Текущий пользователь по access-токену (GET /auth/me). */
export async function getCurrentUser(): Promise<CurrentUser> {
  const res = await authorizedFetch('/auth/me');

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(extractErrorMessage(body, 'Не авторизован'), res.status);
  }

  return body as CurrentUser;
}
