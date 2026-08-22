'use client';

import { useId, useState } from 'react';
import { Alert, Button } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { deleteAvatar, uploadAvatar, type Profile } from '@/lib/profile-api';
import {
  ALLOWED_AVATAR_MIME_TYPES,
  MAX_AVATAR_SIZE_BYTES,
  MAX_AVATAR_SIZE_LABEL,
} from '@/lib/avatar-constraints';
import { useFileUpload } from '@/hooks/useFileUpload';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { UploadDropzone } from '@/components/common/UploadDropzone';
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
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const {
    isDragging,
    uploading,
    error: uploadError,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
  } = useFileUpload({
    validate: validateAvatarFile,
    upload: (file) => uploadAvatar(token, file),
    onUploaded: onChange,
    defaultErrorMessage: 'Не удалось загрузить аватар. Попробуйте ещё раз.',
  });

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAvatar(token);
      onChange({ ...profile, avatarUrl: null });
    } catch (err) {
      setDeleteError(
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
      <UploadDropzone
        inputId={inputId}
        accept={ALLOWED_AVATAR_MIME_TYPES.join(',')}
        disabled={uploading}
        isDragging={isDragging}
        icon={<UploadIcon className="size-6 shrink-0 text-muted" />}
        title={
          uploading
            ? 'Загрузка...'
            : 'Перетащите изображение сюда или нажмите, чтобы выбрать'
        }
        subtitle={`JPEG, PNG, WebP — до ${MAX_AVATAR_SIZE_LABEL}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onInputChange={handleInputChange}
        compact
      />

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

      {uploadError || deleteError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{uploadError ?? deleteError}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        heading="Удалить аватар?"
        onConfirm={handleDelete}
      >
        <p>Аватар будет удалён, вместо него будет показана заглушка.</p>
      </ConfirmDeleteDialog>
    </div>
  );
}
