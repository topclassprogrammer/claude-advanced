'use client';

import { useId } from 'react';
import { Alert, Card, ProgressBar } from '@heroui/react';
import { uploadMeetingFile, type MeetingFile } from '@/lib/meeting-file-api';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  MAX_FILES_PER_MEETING,
} from '@/lib/meeting-file-constraints';
import { getFileIcon } from '@/lib/file-icon';
import { useFileUpload } from '@/hooks/useFileUpload';
import { UploadDropzone } from '@/components/common/UploadDropzone';
import { UploadIcon } from './icons/UploadIcon';

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Недопустимый тип файла. Поддерживаются видео, аудио, документы (PDF, Word, Excel, PowerPoint, текст).';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Файл превышает допустимый размер ${MAX_FILE_SIZE_LABEL}.`;
  }
  return null;
}

export function FileUploadForm({
  meetingId,
  filesCount,
  onUploaded,
  compact = false,
}: {
  meetingId: string;
  /** Текущее число файлов встречи — форма скрывает зону загрузки, когда достигнут лимит MAX_FILES_PER_MEETING. */
  filesCount: number;
  onUploaded: (file: MeetingFile) => void;
  /** Без обёртки Card и заголовка — для встраивания в строку списка встреч. */
  compact?: boolean;
}) {
  const inputId = useId();
  const {
    isDragging,
    uploading,
    currentFile,
    progress,
    error,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
  } = useFileUpload({
    validate: validateFile,
    upload: (file, onProgress) =>
      uploadMeetingFile(meetingId, file, onProgress),
    onUploaded,
    defaultErrorMessage: 'Не удалось загрузить файл. Попробуйте ещё раз.',
  });

  const limitReached = filesCount >= MAX_FILES_PER_MEETING;

  const limitNotice = (
    <div
      className={`flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-border text-center text-muted ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <p className="text-sm font-medium text-foreground">
        Достигнут лимит {MAX_FILES_PER_MEETING} файлов
      </p>
      <p className="text-xs">
        Удалите один из прикреплённых файлов, чтобы загрузить новый.
      </p>
    </div>
  );

  const dropzone = (
    <div className="flex flex-col gap-3">
      <UploadDropzone
        inputId={inputId}
        accept={ALLOWED_MIME_TYPES.join(',')}
        disabled={uploading}
        isDragging={isDragging}
        icon={
          currentFile ? (
            getFileIcon(currentFile.type, {
              className: 'size-6 shrink-0 text-muted',
            })
          ) : (
            <UploadIcon className="size-6 shrink-0 text-muted" />
          )
        }
        title={
          currentFile
            ? currentFile.name
            : 'Перетащите файл сюда или нажмите, чтобы выбрать'
        }
        subtitle={`Видео, аудио, документы — до ${MAX_FILE_SIZE_LABEL}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onInputChange={handleInputChange}
        compact={compact}
      />

      {uploading ? (
        <ProgressBar value={progress} aria-label="Загрузка файла">
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
          <ProgressBar.Output />
        </ProgressBar>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
    </div>
  );

  const content = limitReached ? limitNotice : dropzone;

  if (compact) return content;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Загрузить файл</Card.Title>
      </Card.Header>
      <Card.Content>{content}</Card.Content>
    </Card>
  );
}
