'use client';

import { useId, useState } from 'react';
import { Alert, AlertDialog, Button } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { deleteAvatar, uploadAvatar, type Profile } from '@/lib/profile-api';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
} from '@/lib/avatar-constraints';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';

function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.type)) {
    return 'Недопустимый тип файла. Поддерживаются изображения JPEG, PNG, WebP.';
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return `Файл превышает допустимый размер ${MAX_AVATAR_SIZE_LABEL}.`;
  }
  return null;
}

/**
 * Drag-and-drop зона + выбор кликом для загрузки/замены аватара, и кнопка удаления с
 * подтверждением. `avatarUrl`/`avatarUploadedAt` в ответе бэкенда не содержат уникального
 * значения на каждую загрузку (см. profile.types.ts), поэтому родитель должен сам форсировать
 * перерисовку <Avatar> (например, через key) при изменении профиля через onChange.
 */
export function AvatarUpload({
  token,
  profile,
  onChange,
}: {
  token: string;
  profile: Profile;
  onChange: (profile: Profile) => void;
}) {
  const inputId = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startUpload = async (file: File) => {
    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const updated = await uploadAvatar(token, file);
      onChange(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось загрузить аватар. Попробуйте ещё раз.',
      );
    } finally {
      setUploading(false);
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

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAvatar(token);
      onChange({ ...profile, avatarUrl: null });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось удалить аватар. Попробуйте ещё раз.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 ${
          isDragging ? 'border-accent bg-accent-soft' : 'border-border'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        <UploadIcon className="size-6 shrink-0 text-muted" />
        <p className="text-sm font-medium text-foreground">
          {uploading
            ? 'Загрузка...'
            : 'Перетащите изображение сюда или нажмите, чтобы выбрать'}
        </p>
        <p className="text-xs text-muted">
          JPEG, PNG, WebP — до {MAX_AVATAR_SIZE_LABEL}
        </p>
        <input
          id={inputId}
          type="file"
          className="sr-only"
          accept={ALLOWED_AVATAR_MIME_TYPES.join(',')}
          onChange={handleInputChange}
          disabled={uploading}
        />
      </label>

      {profile.avatarUrl ? (
        <Button
          variant="outline"
          className="self-start text-[var(--danger)]"
          onPress={() => setConfirmOpen(true)}
          isDisabled={deleting}
        >
          <TrashIcon className="size-4 shrink-0" />
          Удалить аватар
        </Button>
      ) : null}

      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <AlertDialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Удалить аватар?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>Аватар будет удалён, вместо него будет показана заглушка.</p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="outline">
                  Отмена
                </Button>
                <Button
                  slot="close"
                  className="bg-[var(--danger)] text-[var(--danger-foreground)]"
                  onPress={handleDelete}
                >
                  Удалить
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
