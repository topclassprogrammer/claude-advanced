'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { ApiError, login } from '@/lib/auth-api';
import { setAccessToken } from '@/lib/session';
import { EMAIL_PATTERN } from '@/lib/email-pattern';
import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { PasswordField } from '@/components/auth/PasswordField';

export default function LoginPage() {
  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    setPending(true);
    try {
      const { accessToken } = await login(email, password);
      setAccessToken(accessToken);
      router.push('/');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
      );
      setPending(false);
    }
  };

  return (
    <AuthFormShell
      title="Вход в аккаунт"
      description="Введите email и пароль, чтобы продолжить"
    >
      <Form onSubmit={onSubmit}>
        <Card.Content className="flex flex-col gap-4">
          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не получилось войти</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : null}

          <TextField
            isRequired
            fullWidth
            isDisabled={isPending}
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
            isDisabled={isPending}
            autoComplete="current-password"
            placeholder="Введите пароль"
            validate={(value) => (value.length > 0 ? null : 'Введите пароль')}
          />
        </Card.Content>

        <Card.Footer className="mt-2 flex flex-col gap-4">
          <Button className="w-full" isPending={isPending} type="submit">
            {({ isPending: pending }) => (
              <>
                {pending ? <Spinner color="current" size="sm" /> : null}
                {pending ? 'Вход...' : 'Войти'}
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted">
            Ещё нет аккаунта?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-accent hover:underline"
            >
              Зарегистрироваться
            </Link>
          </p>
        </Card.Footer>
      </Form>
    </AuthFormShell>
  );
}
