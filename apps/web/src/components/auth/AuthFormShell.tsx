import { Card } from '@heroui/react';
import { Logo } from '@/components/Logo';

/** Общая обёртка форм /auth/login и /auth/register: декоративный фон, лого, Card с заголовком. */
export function AuthFormShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
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
            <Card.Title>{title}</Card.Title>
            <Card.Description>{description}</Card.Description>
          </Card.Header>

          {children}
        </Card>
      </div>
    </div>
  );
}
