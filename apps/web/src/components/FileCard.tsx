'use client';

import { useState } from 'react';
import { Alert, Button, Card, Disclosure, EmptyState } from '@heroui/react';
import type { MeetingFile } from '@/lib/meeting-file-api';
import { MAX_FILES_PER_MEETING } from '@/lib/meeting-file-constraints';
import { getFileIcon } from '@/lib/file-icon';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { StatusChip } from '@/components/common/StatusChip';
import { FileSummaryDisclosure } from '@/components/FileSummaryDisclosure';
import { DownloadIcon } from '@/components/icons/DownloadIcon';
import { TrashIcon } from '@/components/icons/TrashIcon';

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

function FileRow({
  file,
  canDelete,
  onDownload,
  onDelete,
}: {
  file: MeetingFile;
  canDelete: boolean;
  onDownload: (file: MeetingFile) => Promise<void>;
  onDelete: (file: MeetingFile) => Promise<void>;
}) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    try {
      await onDownload(file);
    } catch {
      setError('Не удалось скачать файл. Попробуйте ещё раз.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(file);
    } catch {
      setError('Не удалось удалить файл. Попробуйте ещё раз.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-default p-4">
        {getFileIcon(file.mimeType, {
          className: 'size-6 shrink-0 text-muted',
        })}
        <div className="min-w-0 flex-1 basis-40">
          <p className="truncate font-semibold text-foreground">
            {file.filename}
          </p>
          <p className="text-sm text-muted">
            {formatFileSize(file.size)} · {formatUploadedAt(file.uploadedAt)}
          </p>
          {file.transcription || file.summary ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {file.transcription ? (
                <StatusChip
                  prefix="Транскрипт"
                  status={file.transcription.status}
                  testId="transcription-status-chip"
                />
              ) : null}
              {file.summary ? (
                <StatusChip
                  prefix="Выжимка"
                  status={file.summary.status}
                  testId="summary-status-chip"
                />
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button onPress={handleDownload} isDisabled={downloading}>
            <DownloadIcon className="size-4 shrink-0" />
            {downloading ? 'Скачивание…' : 'Скачать'}
          </Button>
          {canDelete ? (
            <Button
              variant="outline"
              className="text-[var(--danger)]"
              onPress={() => setConfirmOpen(true)}
              isDisabled={deleting}
            >
              <TrashIcon className="size-4 shrink-0" />
              {deleting ? 'Удаление…' : 'Удалить'}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {file.transcription?.status === 'COMPLETED' && file.transcription.text ? (
        <Disclosure.Root className="rounded-xl bg-default px-4">
          <Disclosure.Heading>
            <Disclosure.Trigger>
              Транскрипт
              <Disclosure.Indicator />
            </Disclosure.Trigger>
          </Disclosure.Heading>
          <Disclosure.Content>
            <Disclosure.Body>
              <p
                className="whitespace-pre-wrap text-sm text-foreground"
                data-testid="transcription-text"
              >
                {file.transcription.text}
              </p>
            </Disclosure.Body>
          </Disclosure.Content>
        </Disclosure.Root>
      ) : null}

      {file.summary?.status === 'COMPLETED' ? (
        <FileSummaryDisclosure summary={file.summary} />
      ) : null}

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        heading="Удалить файл?"
        onConfirm={handleDelete}
      >
        <p>
          Файл «{file.filename}» будет удалён без возможности
          восстановления.
        </p>
      </ConfirmDeleteDialog>
    </div>
  );
}

export function FileCard({
  files,
  canDelete,
  onDownload,
  onDelete,
  compact = false,
}: {
  files: MeetingFile[];
  canDelete: boolean;
  onDownload: (file: MeetingFile) => Promise<void>;
  onDelete: (file: MeetingFile) => Promise<void>;
  /** Без обёртки Card и заголовка — для встраивания в строку списка встреч. Ничего не рендерит, если файлов нет. */
  compact?: boolean;
}) {
  if (files.length === 0) {
    if (compact) return null;

    return (
      <Card>
        <Card.Header>
          <Card.Title>Файлы встречи</Card.Title>
        </Card.Header>
        <Card.Content>
          <EmptyState>
            <p className="text-center text-muted">
              К этой встрече файлы не прикреплены.
            </p>
          </EmptyState>
        </Card.Content>
      </Card>
    );
  }

  const rows = (
    <div className="flex flex-col gap-3">
      {files.map((file) => (
        <FileRow
          key={file.id}
          file={file}
          canDelete={canDelete}
          onDownload={onDownload}
          onDelete={onDelete}
        />
      ))}
    </div>
  );

  if (compact) return rows;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Файлы встречи</Card.Title>
        <Card.Description>
          {files.length} из {MAX_FILES_PER_MEETING}
        </Card.Description>
      </Card.Header>
      <Card.Content>{rows}</Card.Content>
    </Card>
  );
}
