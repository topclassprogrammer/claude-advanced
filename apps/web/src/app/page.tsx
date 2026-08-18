'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Card, EmptyState, IconCalendar, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetings, type Meeting } from '@/lib/meeting-api';
import {
  clearAccessToken,
  getAccessToken,
  getEmailFromToken,
} from '@/lib/session';
import { BrandIcon } from '@/components/BrandIcon';
import { UsersIcon } from '@/components/icons/UsersIcon';

const RECENT_MEETINGS_COUNT = 3;

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMeetingDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
}

function MeetingRow({
  meeting,
  highlighted,
}: {
  meeting: Meeting;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${highlighted ? 'bg-accent-soft' : 'bg-default'}`}
    >
      <p className="font-semibold text-foreground">{meeting.title}</p>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <IconCalendar className="size-4 shrink-0" />
        <span>{formatMeetingDate(meeting.date)}</span>
      </div>
      {meeting.participants.length > 0 ? (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <UsersIcon className="size-4 shrink-0" />
          <span className="truncate">{meeting.participants.join(', ')}</span>
        </div>
      ) : null}
    </div>
  );
}

type Session = { token: string; email: string | null };

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    // localStorage — внешнее (browser-only) хранилище, недоступное при SSR,
    // поэтому токен можно прочитать только на клиенте внутри эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({ token, email: getEmailFromToken(token) });
  }, [router]);

  useEffect(() => {
    if (!session) return;

    getMeetings(session.token)
      .then(setMeetings)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      });
  }, [session]);

  const onLogout = () => {
    clearAccessToken();
    router.replace('/auth/login');
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const recentMeetings = meetings
    ? [...meetings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_MEETINGS_COUNT)
    : [];

  return (
    <div className="flex min-h-screen justify-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandIcon />
            <div>
              <p className="font-semibold text-foreground">Видеовстречи</p>
              <p className="text-sm text-muted">{session.email}</p>
            </div>
          </div>
          <Button variant="outline" onPress={onLogout}>
            Выйти
          </Button>
        </header>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить встречи</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {meetings === null && !error ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : null}

        {meetings !== null && meetings.length === 0 ? (
          <EmptyState>
            <p className="text-center text-muted">У вас пока нет встреч.</p>
          </EmptyState>
        ) : null}

        {recentMeetings.length > 0 ? (
          <Card>
            <Card.Header>
              <Card.Title>Последние встречи</Card.Title>
              <Card.Description>
                {recentMeetings.length} самые свежие из ваших встреч
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              {recentMeetings.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} highlighted />
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {meetings && meetings.length > 0 ? (
          <Card>
            <Card.Header>
              <Card.Title>Все встречи</Card.Title>
              <Card.Description>Всего: {meetings.length}</Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              {meetings.map((meeting) => (
                <MeetingRow key={meeting.id} meeting={meeting} />
              ))}
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
