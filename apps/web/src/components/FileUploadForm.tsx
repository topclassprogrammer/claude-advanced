'use client';

import { useId, useRef, useState } from 'react';
import { Alert, Card, ProgressBar } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { uploadMeetingFile, type MeetingFile } from '@/lib/meeting-file-api';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
} from '@/lib/meeting-file-constraints';
import { getFileIcon } from '@/lib/file-icon';
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
  token,
  meetingId,
  onUploaded,
}: {
  token: string;
  meetingId: string;
  onUploaded: (file: MeetingFile) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadingMime, setUploadingMime] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startUpload = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setUploadingName(file.name);
    setUploadingMime(file.type);
    setProgress(0);
    try {
      const uploaded = await uploadMeetingFile(
        token,
        meetingId,
        file,
        setProgress,
      );
      onUploaded(uploaded);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось загрузить файл. Попробуйте ещё раз.',
      );
    } finally {
      setUploading(false);
      setUploadingName(null);
      setUploadingMime(null);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void startUpload(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void startUpload(file);
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Загрузить файл</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${
            isDragging ? 'border-accent bg-accent-soft' : 'border-border'
          } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
        >
          {uploadingMime ? (
            getFileIcon(uploadingMime, {
              className: 'size-6 shrink-0 text-muted',
            })
          ) : (
            <UploadIcon className="size-6 shrink-0 text-muted" />
          )}
          <p className="text-sm font-medium text-foreground">
            {uploadingName
              ? uploadingName
              : 'Перетащите файл сюда или нажмите, чтобы выбрать'}
          </p>
          <p className="text-xs text-muted">
            Видео, аудио, документы — до {MAX_FILE_SIZE_LABEL}
          </p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleInputChange}
            disabled={uploading}
          />
        </label>

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
      </Card.Content>
    </Card>
  );
}
