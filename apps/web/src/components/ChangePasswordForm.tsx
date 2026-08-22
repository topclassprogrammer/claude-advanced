'use client';

import { useState } from 'react';
import { Alert, Button, Form } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { changePassword } from '@/lib/profile-api';
import { PasswordField } from '@/components/auth/PasswordField';

const MIN_PASSWORD_LENGTH = 8;

/** Форма смены пароля на странице профиля. */
export function ChangePasswordForm({ token }: { token: string }) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const passwordsMismatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword !== confirmPassword;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);
    const oldPassword = String(formData.get('oldPassword') ?? '');
    const newPasswordValue = String(formData.get('newPassword') ?? '');
    const confirmPasswordValue = String(formData.get('confirmPassword') ?? '');
    if (!oldPassword || !newPasswordValue || !confirmPasswordValue) return;
    if (newPasswordValue !== confirmPasswordValue) {
      setError('Пароли не совпадают');
      return;
    }

    setPending(true);
    try {
      await changePassword(token, oldPassword, newPasswordValue);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setFormKey((key) => key + 1);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось изменить пароль. Попробуйте ещё раз.',
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <Form key={formKey} onSubmit={onSubmit} className="flex flex-col gap-3">
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      {success ? (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>Пароль изменён</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <PasswordField
        name="oldPassword"
        label="Текущий пароль"
        isDisabled={isPending}
        autoComplete="current-password"
        placeholder="Текущий пароль"
        validate={(value) => (value ? null : 'Введите текущий пароль')}
      />
      <PasswordField
        name="newPassword"
        label="Новый пароль"
        isDisabled={isPending}
        autoComplete="new-password"
        placeholder="Новый пароль"
        minLength={MIN_PASSWORD_LENGTH}
        validate={(value) =>
          value.length >= MIN_PASSWORD_LENGTH
            ? null
            : `Минимум ${MIN_PASSWORD_LENGTH} символов`
        }
        onChange={setNewPassword}
      />
      <PasswordField
        name="confirmPassword"
        label="Подтверждение нового пароля"
        isDisabled={isPending}
        autoComplete="new-password"
        placeholder="Повторите новый пароль"
        validate={(value) =>
          value === newPassword ? null : 'Пароли не совпадают'
        }
        onChange={setConfirmPassword}
      />

      <Button
        type="submit"
        isPending={isPending}
        isDisabled={passwordsMismatch}
        className="self-start"
      >
        {isPending ? 'Сохранение...' : 'Изменить пароль'}
      </Button>
    </Form>
  );
}
