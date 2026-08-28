'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, Button, FieldError, Form, Input, Label, Spinner, TextField } from '@heroui/react';
import { ApiError, login } from '@/lib/auth-api';
import { EMAIL_PATTERN } from '@/lib/email-pattern';
import { AuthScreenShell } from '@/components/auth/AuthScreenShell';
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
      await login(email, password);
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
    <AuthScreenShell
      promoHeadline="Продолжите там, где остановились"
      promoSub="Записи, расшифровки, итоги и задачи ваших встреч — всё на месте."
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-heading-l text-foreground">Вход в аккаунт</h2>
        <p className="text-body text-muted">Введите почту и пароль, чтобы продолжить.</p>
      </div>

      <Form onSubmit={onSubmit} className="flex flex-col gap-[26px]">
        <div className="flex flex-col gap-4.5">
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
            validate={(value) => (EMAIL_PATTERN.test(value) ? null : 'Введите корректный email')}
          >
            <Label>Email</Label>
            <Input autoComplete="email" autoFocus placeholder="you@example.com" />
            <FieldError />
          </TextField>

          <PasswordField
            isDisabled={isPending}
            autoComplete="current-password"
            placeholder="Введите пароль"
            validate={(value) => (value.length > 0 ? null : 'Введите пароль')}
          />
        </div>

        <Button className="w-full" isPending={isPending} type="submit">
          {({ isPending: pending }) => (
            <>
              {pending ? <Spinner color="current" size="sm" /> : null}
              {pending ? 'Вход...' : 'Войти'}
            </>
          )}
        </Button>
      </Form>

      <p className="border-t border-border pt-5 text-body-s text-muted">
        Ещё нет аккаунта?{' '}
        <Link href="/auth/register" className="text-label text-accent hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </AuthScreenShell>
  );
}
