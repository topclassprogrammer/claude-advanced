const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

export interface RegisteredUser {
  /** Bearer-токен для прямых вызовов apps/api из хелперов (см. jwt-auth.guard.ts fallback). */
  accessToken: string;
  /** Значение Set-Cookie refreshToken из ответа — сидируется в браузер через helpers/session.ts. */
  refreshTokenCookie: string;
}

export async function registerUser(
  email: string,
  password: string,
): Promise<RegisteredUser> {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to register user: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { accessToken: string };
  const refreshTokenCookie = res.headers.get('set-cookie');
  if (!refreshTokenCookie) {
    throw new Error('Register response did not set a refresh token cookie');
  }
  return { accessToken: body.accessToken, refreshTokenCookie };
}

export async function createMeeting(
  token: string,
  payload: { title: string; date: string; participants: string[] },
): Promise<string> {
  const res = await fetch(`${API_URL}/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to create meeting: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}

export async function getMeeting(
  token: string,
  meetingId: string,
): Promise<{ id: string; title: string; date: string; organizerId: string }> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to get meeting: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function updateProfileName(
  token: string,
  name: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/users/me/name`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to update profile name: ${res.status} ${await res.text()}`,
    );
  }
}

export async function uploadAvatar(
  token: string,
  filename: string,
  content: Buffer,
  mimeType: string,
): Promise<void> {
  const form = new FormData();
  form.append(
    'avatar',
    new Blob([new Uint8Array(content)], { type: mimeType }),
    filename,
  );

  const res = await fetch(`${API_URL}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(
      `Failed to upload avatar: ${res.status} ${await res.text()}`,
    );
  }
}

export async function uploadMeetingFile(
  token: string,
  meetingId: string,
  filename: string,
  content: string,
  mimeType: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', new Blob([content], { type: mimeType }), filename);

  const res = await fetch(`${API_URL}/meetings/${meetingId}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(
      `Failed to upload meeting file: ${res.status} ${await res.text()}`,
    );
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}
