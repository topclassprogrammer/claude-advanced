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
  InputGroup,
  Label,
  Spinner,
  TextField,
  ToggleButton,
} from '@heroui/react';
import { ApiError, login } from '@/lib/auth-api';
import { setAccessToken } from '@/lib/session';
import { Logo } from '@/components/Logo';
import { EyeIcon, EyeOffIcon } from '@/components/icons/EyeIcon';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -left-24 size-96 rounded-full bg-accent/20 blur-3xl dark:bg-accent/25"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-32 size-96 rounded-full bg-accent/10 blur-3xl dark:bg-accent/15"
      />

      <div className="relative flex w-full max-w-md flex-col items-center">
        <Logo />

        <Card className="w-full">
          <Card.Header>
            <Card.Title>Вход в аккаунт</Card.Title>
            <Card.Description>
              Введите email и пароль, чтобы продолжить
            </Card.Description>
          </Card.Header>

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

              <TextField
                isRequired
                fullWidth
                isDisabled={isPending}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                validate={(value) =>
                  value.length > 0 ? null : 'Введите пароль'
                }
              >
                <Label>Пароль</Label>
                <InputGroup fullWidth>
                  <InputGroup.Input
                    autoComplete="current-password"
                    placeholder="Введите пароль"
                  />
                  <InputGroup.Suffix>
                    <ToggleButton
                      isIconOnly
                      isDisabled={isPending}
                      isSelected={isPasswordVisible}
                      onChange={setPasswordVisible}
                      size="sm"
                      variant="ghost"
                      aria-label={
                        isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'
                      }
                    >
                      {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                    </ToggleButton>
                  </InputGroup.Suffix>
                </InputGroup>
                <FieldError />
              </TextField>
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
        </Card>
      </div>
    </div>
  );
}
