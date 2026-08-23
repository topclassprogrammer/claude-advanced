import { mkdirSync } from 'fs';
import { join } from 'path';

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export const MAX_FILES_PER_MEETING = 10;

export const ALLOWED_MIME_TYPES = [
  // видео
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // аудио
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  // документы
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
];

export const STORAGE_DIR = join(process.cwd(), 'storage', 'meeting-files');

mkdirSync(STORAGE_DIR, { recursive: true });

/**
 * Расширение на диске выбирается по этой карте, а не берётся из
 * client-controlled `file.originalname` — иначе клиент мог бы задать
 * произвольное расширение (например `.php`) для загруженного файла.
 */
export const MIME_TO_EXTENSION: Record<string, string> = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
  'text/plain': '.txt',
};
