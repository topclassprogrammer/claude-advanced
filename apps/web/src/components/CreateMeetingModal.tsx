'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Modal,
  Spinner,
  TextArea,
  TextField,
} from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { createMeeting, type Meeting } from '@/lib/meeting-api';
import { PlusIcon } from '@/components/icons/PlusIcon';

export function CreateMeetingModal({
  onCreated,
  className,
  iconOnly = false,
}: {
  onCreated: (meeting: Meeting) => void;
  /** Классы кнопки-триггера (по умолчанию — обычная кнопка без доп. стилей). */
  className?: string;
  /** Только иконка плюса, без текста — для тесных мест (мобильный топбар). */
  iconOnly?: boolean;
}) {
  const [isOpen, setOpen] = useState(false);
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') ?? '');
    const date = String(formData.get('date') ?? '');
    const description = String(formData.get('description') ?? '').trim();

    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      setError('Укажите корректную дату встречи');
      return;
    }

    setPending(true);
    try {
      const meeting = await createMeeting({
        title,
        date: parsedDate.toISOString(),
        description: description || undefined,
      });
      onCreated(meeting);
      form.reset();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        className={className}
        onPress={() => setOpen(true)}
        isIconOnly={iconOnly}
        aria-label={iconOnly ? 'Создать встречу' : undefined}
      >
        <PlusIcon width={16} height={16} />
        {iconOnly ? null : 'Создать встречу'}
      </Button>

      <Modal isOpen={isOpen} onOpenChange={setOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Form onSubmit={onSubmit}>
                <Modal.Header>
                  <Modal.Heading>Новая встреча</Modal.Heading>
                </Modal.Header>

                <Modal.Body className="flex flex-col gap-4">
                  {error ? (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>Не удалось создать встречу</Alert.Title>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  ) : null}

                  <TextField
                    isRequired
                    fullWidth
                    isDisabled={isPending}
                    name="title"
                  >
                    <Label>Заголовок</Label>
                    <Input
                      autoFocus
                      placeholder="Например, Планирование спринта"
                    />
                    <FieldError />
                  </TextField>

                  <TextField
                    isRequired
                    fullWidth
                    isDisabled={isPending}
                    name="date"
                    type="datetime-local"
                  >
                    <Label>Дата и время</Label>
                    <Input />
                    <FieldError />
                  </TextField>

                  <TextField
                    fullWidth
                    isDisabled={isPending}
                    name="description"
                  >
                    <Label>Описание</Label>
                    <TextArea placeholder="О чём встреча (необязательно)" />
                    <FieldError />
                  </TextField>
                </Modal.Body>

                <Modal.Footer>
                  <Button slot="close" variant="outline" isDisabled={isPending}>
                    Отмена
                  </Button>
                  <Button type="submit" isPending={isPending}>
                    {({ isPending: pending }) => (
                      <>
                        {pending ? <Spinner color="current" size="sm" /> : null}
                        {pending ? 'Создание…' : 'Создать'}
                      </>
                    )}
                  </Button>
                </Modal.Footer>
              </Form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
