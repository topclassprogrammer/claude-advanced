import { ApiError, authorizedFetch } from './auth-api';

export type Meeting = {
  id: string;
  title: string;
  date: string;
  description: string | null;
  participants: string[];
  organizerId: string;
  createdAt: string;
};

export type CreateMeetingInput = {
  title: string;
  date: string;
  description?: string;
  participants?: string[];
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function getMeetings(): Promise<Meeting[]> {
  const res = await authorizedFetch('/meetings');

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить список встреч'),
      res.status,
    );
  }

  return body as Meeting[];
}

export async function createMeeting(input: CreateMeetingInput): Promise<Meeting> {
  const res = await authorizedFetch('/meetings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participants: [], ...input }),
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось создать встречу'),
      res.status,
    );
  }

  return body as Meeting;
}

/** Удаляет встречу. Доступно только организатору встречи (403 для остальных на бэкенде). */
export async function deleteMeeting(id: string): Promise<void> {
  const res = await authorizedFetch(`/meetings/${id}`, { method: 'DELETE' });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось удалить встречу'),
      res.status,
    );
  }
}

export async function getMeetingById(id: string): Promise<Meeting> {
  const res = await authorizedFetch(`/meetings/${id}`);

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить встречу'),
      res.status,
    );
  }

  return body as Meeting;
}
