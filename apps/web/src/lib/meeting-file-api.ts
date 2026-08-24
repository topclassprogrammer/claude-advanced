import { ApiError, authorizedFetch, getAccessToken } from './auth-api';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type TranscriptionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type MeetingFileTranscription = {
  status: TranscriptionStatus;
  text: string | null;
};

export type SummaryStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type MeetingFileActionItem = {
  text: string;
  assignee: string | null;
};

export type MeetingFileSummary = {
  status: SummaryStatus;
  summary: string | null;
  actionItems: MeetingFileActionItem[];
  decisions: string[];
};

export type MeetingFile = {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  transcription: MeetingFileTranscription | null;
  summary: MeetingFileSummary | null;
};

/** Файл ещё ожидает или проходит транскрибацию — актуальный статус нужно поллить. */
export function isTranscriptionInProgress(file: MeetingFile): boolean {
  return (
    file.transcription?.status === 'PENDING' ||
    file.transcription?.status === 'PROCESSING'
  );
}

/** Выжимка файла ещё ожидает или проходит обработку — актуальный статус нужно поллить. */
export function isSummaryInProgress(file: MeetingFile): boolean {
  return (
    file.summary?.status === 'PENDING' || file.summary?.status === 'PROCESSING'
  );
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const { message } = body as { message: unknown };
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

/** Список файлов встречи (до 10, самые новые первыми). */
export async function getMeetingFiles(meetingId: string): Promise<MeetingFile[]> {
  const res = await authorizedFetch(`/meetings/${meetingId}/files`);

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось загрузить список файлов встречи'),
      res.status,
    );
  }

  return body as MeetingFile[];
}

/**
 * Загружает файл встречи с отслеживанием прогресса отправки.
 * Используется XMLHttpRequest, а не fetch: fetch не даёт событий прогресса для тела запроса,
 * только для чтения ответа (см. docs/research-meeting-file-upload.md, §5) — поэтому не может
 * идти через authorizedFetch (нет retry-on-401, access-токен из памяти прикладывается напрямую).
 * Возвращает 409, если у встречи уже прикреплено максимальное число файлов (10).
 */
export function uploadMeetingFile(
  meetingId: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<MeetingFile> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/meetings/${meetingId}/files`);
    const token = getAccessToken();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

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

/** Удаляет файл встречи. Доступно только организатору встречи (403 для остальных на бэкенде). */
export async function deleteMeetingFile(
  meetingId: string,
  fileId: string,
): Promise<void> {
  const res = await authorizedFetch(`/meetings/${meetingId}/files/${fileId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(
      extractErrorMessage(body, 'Не удалось удалить файл'),
      res.status,
    );
  }
}

/** Скачивает файл встречи с авторизацией и запускает сохранение в браузере через blob-ссылку. */
export async function downloadMeetingFile(
  meetingId: string,
  fileId: string,
  filename: string,
): Promise<void> {
  const res = await authorizedFetch(
    `/meetings/${meetingId}/files/${fileId}/download`,
  );

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
