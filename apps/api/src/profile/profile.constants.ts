import { mkdirSync } from 'fs';
import { join } from 'path';

export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const AVATAR_STORAGE_DIR = join(process.cwd(), 'storage', 'avatars');

mkdirSync(AVATAR_STORAGE_DIR, { recursive: true });
