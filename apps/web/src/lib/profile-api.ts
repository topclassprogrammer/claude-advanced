import { ApiError, authorizedFetch } from './auth-api';

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

export async function getProfile(): Promise<Profile> {
  const res = await authorizedFetch('/users/me');

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить профиль'),
      res.status,
    );
  }

  return body as Profile;
}

/** Обновляет имя текущего пользователя, возвращает обновлённый профиль. */
export async function updateProfileName(name: string): Promise<Profile> {
  const res = await authorizedFetch('/users/me/name', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось обновить имя'),
      res.status,
    );
  }

  return body as Profile;
}

/** Меняет пароль текущего пользователя. */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  const res = await authorizedFetch('/users/me/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось изменить пароль'),
      res.status,
    );
  }
}

/** Загружает (или заменяет) аватар текущего пользователя, возвращает обновлённый профиль. */
export async function uploadAvatar(file: File): Promise<Profile> {
  const form = new FormData();
  form.append('avatar', file);

  const res = await authorizedFetch('/users/me/avatar', {
    method: 'POST',
    body: form,
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить аватар'),
      res.status,
    );
  }

  return body as Profile;
}

/** Удаляет аватар текущего пользователя — профиль возвращается к заглушке. */
export async function deleteAvatar(): Promise<void> {
  const res = await authorizedFetch('/users/me/avatar', { method: 'DELETE' });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось удалить аватар'),
      res.status,
    );
  }
}

/**
 * Скачивает файл аватара с авторизацией и возвращает object URL для использования в <img>.
 * Вызывающий код должен освободить URL через URL.revokeObjectURL при размонтировании.
 */
export async function getAvatarObjectUrl(): Promise<string> {
  const res = await authorizedFetch('/users/me/avatar');

  if (!res.ok) {
    throw new ApiError('Не удалось загрузить аватар', res.status);
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}
