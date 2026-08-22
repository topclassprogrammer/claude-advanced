'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { updateProfileName, type Profile } from '@/lib/profile-api';

/** Форма редактирования имени пользователя на странице профиля. */
export function ProfileNameForm({
  token,
  name,
  onUpdated,
}: {
  token: string;
  name: string;
  onUpdated: (profile: Profile) => void;
}) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const nextName = String(formData.get('name') ?? '').trim();
    if (!nextName) return;

    setPending(true);
    try {
      const updated = await updateProfileName(token, nextName);
      onUpdated(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось обновить имя. Попробуйте ещё раз.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <TextField
        isRequired
        fullWidth
        isDisabled={isPending}
        name="name"
        defaultValue={name}
        validate={(value) => (value.trim().length > 0 ? null : 'Введите имя')}
      >
        <Label>Имя</Label>
        <Input placeholder="Ваше имя" />
        <FieldError />
      </TextField>

      <Button type="submit" isPending={isPending} className="self-start">
        {isPending ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </Form>
  );
}
