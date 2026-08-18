import { ApiError } from './auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type Meeting = {
  id: string;
  title: string;
  date: string;
  participants: string[];
  organizerId: string;
  createdAt: string;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function getMeetings(token: string): Promise<Meeting[]> {
  const res = await fetch(`${API_URL}/meetings`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить список встреч'),
      res.status,
    );
  }

  return body as Meeting[];
}
