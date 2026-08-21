import { ApiError } from './auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Profile = {
  email: string;
  name: string;
  avatarUrl: string | null;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function getProfile(token: string): Promise<Profile> {
  const res = await fetch(`${API_URL}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить профиль'),
      res.status,
    );
  }

  return body as Profile;
}

/**
 * Скачивает файл аватара с авторизацией и возвращает object URL для использования в <img>.
 * Эндпоинт отдачи аватара требует Bearer-токен, поэтому обычный <img src> не подходит —
 * та же причина, что и у downloadMeetingFile в meeting-file-api.ts.
 * Вызывающий код должен освободить URL через URL.revokeObjectURL при размонтировании.
 */
export async function getAvatarObjectUrl(token: string): Promise<string> {
  const res = await fetch(`${API_URL}/users/me/avatar`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new ApiError('Не удалось загрузить аватар', res.status);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
