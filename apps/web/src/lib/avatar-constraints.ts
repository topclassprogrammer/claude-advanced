/**
 * Зеркалит apps/api/src/profile/profile.constants.ts — общего пакета между
 * apps/web и apps/api нет, поэтому список синхронизируется вручную при изменении бэкенда.
 */
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const MAX_AVATAR_SIZE_LABEL = '5 МБ';
