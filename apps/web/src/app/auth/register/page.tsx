'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  Description,
  FieldError,
  Form,
  Input,
  InputGroup,
  Label,
  Spinner,
  TextField,
  ToggleButton,
} from '@heroui/react';
import { ApiError, register } from '@/lib/auth-api';
import { setAccessToken } from '@/lib/session';
import { Logo } from '@/components/Logo';
import { EyeIcon, EyeOffIcon } from '@/components/icons/EyeIcon';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

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
            <Card.Title>Создать аккаунт</Card.Title>
            <Card.Description>
              Укажите email и пароль, чтобы начать пользоваться сервисом
            </Card.Description>
          </Card.Header>

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

              <TextField
                isRequired
                fullWidth
                isDisabled={isPending || success}
                minLength={6}
                name="password"
                type={isPasswordVisible ? 'text' : 'password'}
                validate={(value) =>
                  value.length >= 6
                    ? null
                    : 'Пароль должен содержать не менее 6 символов'
                }
              >
                <Label>Пароль</Label>
                <InputGroup fullWidth>
                  <InputGroup.Input
                    autoComplete="new-password"
                    placeholder="Не менее 6 символов"
                  />
                  <InputGroup.Suffix>
                    <ToggleButton
                      isIconOnly
                      isDisabled={isPending || success}
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
                <Description>Минимум 6 символов</Description>
                <FieldError />
              </TextField>
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
        </Card>
      </div>
    </div>
  );
}
