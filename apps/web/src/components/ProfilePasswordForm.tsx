'use client';

import { useState } from 'react';
import {
  Alert,
  Button,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  TextField,
} from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { changePassword } from '@/lib/profile-api';
import { EyeIcon, EyeOffIcon } from './icons/EyeIcon';

const MIN_PASSWORD_LENGTH = 8;

/** Форма смены пароля на странице профиля. */
export function ProfilePasswordForm({ token }: { token: string }) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const oldPassword = String(formData.get('oldPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    if (!oldPassword || !newPassword) return;

    setPending(true);
    try {
      await changePassword(token, oldPassword, newPassword);
      setSuccess(true);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Неверный текущий пароль.');
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось сменить пароль. Попробуйте ещё раз.',
        );
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Form onSubmit={onSubmit} className="flex flex-col gap-3">
      {success ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>Пароль изменён.</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

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
        name="oldPassword"
        type={isPasswordVisible ? 'text' : 'password'}
        validate={(value) => (value.length > 0 ? null : 'Введите текущий пароль')}
      >
        <Label>Текущий пароль</Label>
        <InputGroup fullWidth>
          <InputGroup.Input placeholder="••••••••" />
          <InputGroup.Suffix>
            <Button
              variant="ghost"
              isIconOnly
              aria-label={
                isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'
              }
              onPress={() => setPasswordVisible((v) => !v)}
            >
              {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
        <FieldError />
      </TextField>

      <TextField
        isRequired
        fullWidth
        isDisabled={isPending}
        name="newPassword"
        type={isPasswordVisible ? 'text' : 'password'}
        validate={(value) =>
          value.length >= MIN_PASSWORD_LENGTH
            ? null
            : 'Новый пароль должен содержать минимум 8 символов'
        }
      >
        <Label>Новый пароль</Label>
        <Input placeholder="••••••••" />
        <FieldError />
      </TextField>

      <Button type="submit" isPending={isPending} className="self-start">
        {isPending ? 'Сохранение...' : 'Сменить пароль'}
      </Button>
    </Form>
  );
}
