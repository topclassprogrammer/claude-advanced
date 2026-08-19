import { ApiError } from './auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type MeetingFile = {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
};

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export async function getMeetingFile(
  token: string,
  meetingId: string,
): Promise<MeetingFile | null> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить данные файла встречи'),
      res.status,
    );
  }

  return body as MeetingFile;
}

/**
 * Загружает файл встречи с отслеживанием прогресса отправки.
 * Используется XMLHttpRequest, а не fetch: fetch не даёт событий прогресса для тела запроса,
 * только для чтения ответа (см. docs/research-meeting-file-upload.md, §5).
 */
export function uploadMeetingFile(
  token: string,
  meetingId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MeetingFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/meetings/${meetingId}/file`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let body: unknown = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        body = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as MeetingFile);
      } else {
        reject(
          new ApiError(
            extractErrorMessage(body, 'Не удалось загрузить файл'),
            xhr.status,
          ),
        );
      }
    });

    xhr.addEventListener('error', () => {
      reject(
        new ApiError('Не удалось связаться с сервером. Попробуйте ещё раз.', 0),
      );
    });

    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/** Скачивает файл встречи с авторизацией и запускает сохранение в браузере через blob-ссылку. */
export async function downloadMeetingFile(
  token: string,
  meetingId: string,
  filename: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/meetings/${meetingId}/file/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось скачать файл'),
      res.status,
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
