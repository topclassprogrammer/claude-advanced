'use client';

import { useState } from 'react';
import { Alert, Button, Card, EmptyState } from '@heroui/react';
import type { MeetingFile } from '@/lib/meeting-file-api';
import { getFileIcon } from '@/lib/file-icon';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function formatUploadedAt(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
}

export function FileCard({
  file,
  onDownload,
}: {
  file: MeetingFile | null;
  onDownload: () => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!file) {
    return (
      <Card>
        <Card.Header>
          <Card.Title>Файл встречи</Card.Title>
        </Card.Header>
        <Card.Content>
          <EmptyState>
            <p className="text-center text-muted">
              К этой встрече файл не прикреплён.
            </p>
          </EmptyState>
        </Card.Content>
      </Card>
    );
  }

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await onDownload();
    } catch {
      setError('Не удалось скачать файл. Попробуйте ещё раз.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <Card.Header>
        <Card.Title>Файл встречи</Card.Title>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-default p-4">
          {getFileIcon(file.mimeType, {
            className: 'size-6 shrink-0 text-muted',
          })}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">
              {file.filename}
            </p>
            <p className="text-sm text-muted">
              {formatFileSize(file.size)} · {formatUploadedAt(file.uploadedAt)}
            </p>
          </div>
          <Button onPress={handleDownload} isDisabled={downloading}>
            {downloading ? 'Скачивание…' : 'Скачать'}
          </Button>
        </div>
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
