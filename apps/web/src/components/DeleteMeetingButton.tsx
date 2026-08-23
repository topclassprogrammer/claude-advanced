'use client';

import { useState } from 'react';
import { Alert, Button } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { deleteMeeting, type Meeting } from '@/lib/meeting-api';
import { ConfirmDeleteDialog } from '@/components/common/ConfirmDeleteDialog';
import { TrashIcon } from '@/components/icons/TrashIcon';

/** Кнопка удаления встречи с подтверждением. Видима только организатору — бэкенд разрешает удаление только ему (403 для остальных). */
export function DeleteMeetingButton({
  meeting,
  onDeleted,
}: {
  meeting: Meeting;
  onDeleted: (meetingId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMeeting(meeting.id);
      onDeleted(meeting.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось удалить встречу. Попробуйте ещё раз.',
      );
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        isIconOnly
        variant="ghost"
        className="text-[var(--danger)]"
        onPress={() => setConfirmOpen(true)}
        isDisabled={deleting}
        aria-label="Удалить встречу"
      >
        <TrashIcon className="size-4 shrink-0" />
      </Button>

      <ConfirmDeleteDialog
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        heading="Удалить встречу?"
        onConfirm={handleDelete}
      >
        <p>
          Встреча «{meeting.title}» будет удалена без возможности
          восстановления, вместе со всеми прикреплёнными файлами.
        </p>
        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}
      </ConfirmDeleteDialog>
    </>
  );
}
