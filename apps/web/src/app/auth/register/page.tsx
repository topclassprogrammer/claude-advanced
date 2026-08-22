'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  TextField,
} from '@heroui/react';
import { ApiError, register } from '@/lib/auth-api';
import { setAccessToken } from '@/lib/session';
import { EMAIL_PATTERN } from '@/lib/email-pattern';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { PasswordField } from '@/components/auth/PasswordField';

export default function RegisterPage() {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setPending(true);
    try {
      const { accessToken } = await register(email, password);
      setAccessToken(accessToken);
      setSuccess(true);
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
    <AuthFormShell
      title="Создать аккаунт"
      description="Укажите email и пароль, чтобы начать пользоваться сервисом"
    >
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не получилось зарегистрироваться</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          {success ? (
            <Alert status="success">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Аккаунт создан</Alert.Title>
                <Alert.Description>
                  Вы успешно зарегистрированы и вошли в систему.
                </Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextField
            isRequired
            fullWidth
            isDisabled={isPending || success}
            name="email"
            type="email"
            validate={(value) =>
              EMAIL_PATTERN.test(value) ? null : 'Введите корректный email'
            }
          >
            <Label>Email</Label>
            <Input
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
            />
            <FieldError />
          </TextField>

          <PasswordField
            isDisabled={isPending || success}
            autoComplete="new-password"
            placeholder="Не менее 6 символов"
            minLength={6}
            description="Минимум 6 символов"
            validate={(value) =>
              value.length >= 6
                ? null
                : 'Пароль должен содержать не менее 6 символов'
            }
          />
        </Card.Content>

        <Card.Footer className="mt-2 flex flex-col gap-4">
          <Button
            className="w-full"
            isDisabled={success}
            isPending={isPending}
            type="submit"
          >
            {({ isPending: pending }) => (
              <>
                {pending ? <Spinner color="current" size="sm" /> : null}
                {pending
                  ? 'Регистрация...'
                  : success
                    ? 'Зарегистрировано'
                    : 'Зарегистрироваться'}
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted">
            Уже есть аккаунт?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-accent hover:underline"
            >
              Войти
            </Link>
          </p>
        </Card.Footer>
      </Form>
    </AuthFormShell>
  );
}
