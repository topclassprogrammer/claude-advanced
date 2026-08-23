/**
 * PRD ограничивает автозапуск транскрибации файлами mp4/mp3 — не всеми
 * аудио/видео MIME-типами из ALLOWED_MIME_TYPES меeting-file модуля.
 */
export const TRANSCRIBABLE_MIME_TYPES = ['video/mp4', 'audio/mpeg'];

/** "low"-тир из PRD — самая быстрая/лёгкая модель Whisper. */
export const WHISPER_MODEL = 'tiny';
