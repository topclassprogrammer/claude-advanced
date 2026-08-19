'use client';

import { useState } from 'react';
import { AlertDialog, Alert, Button } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { deleteMeeting, type Meeting } from '@/lib/meeting-api';
import { TrashIcon } from '@/components/icons/TrashIcon';

/** Кнопка удаления встречи с подтверждением. Видима только организатору — бэкенд разрешает удаление только ему (403 для остальных). */
export function DeleteMeetingButton({
  meeting,
  token,
  onDeleted,
}: {
  meeting: Meeting;
  token: string;
  onDeleted: (meetingId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteMeeting(token, meeting.id);
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

      <AlertDialog isOpen={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Удалить встречу?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="flex flex-col gap-3">
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
    </>
  );
}
