/**
 * Зеркалит apps/api/src/meeting-file/meeting-file.constants.ts — общего пакета между
 * apps/web и apps/api нет, поэтому список синхронизируется вручную при изменении бэкенда.
 */
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

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

export const MAX_FILE_SIZE_LABEL = '100 МБ';
