'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, EmptyState, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetings, type Meeting } from '@/lib/meeting-api';
import { getProfile, type Profile } from '@/lib/profile-api';
import { groupMeetings } from '@/lib/meeting-grouping';
import { useSession } from '@/hooks/useSession';
import { Avatar } from '@/components/Avatar';
import { BrandIcon } from '@/components/BrandIcon';
import { CreateMeetingModal } from '@/components/CreateMeetingModal';
import { RecentMeetingsSection } from '@/components/home/RecentMeetingsSection';
import { UpcomingMeetingsSection } from '@/components/home/UpcomingMeetingsSection';
import { PastMeetingsSection } from '@/components/home/PastMeetingsSection';

export default function HomePage() {
  const { session, logout } = useSession();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!session) return;

    getMeetings()
      .then(setMeetings)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      });
  }, [session]);

  useEffect(() => {
    if (!session) return;

    getProfile()
      .then(setProfile)
      .catch(() => {
        // Шапка остаётся с email, если профиль не удалось загрузить.
      });
  }, [session]);

  const onMeetingCreated = (meeting: Meeting) => {
    setMeetings((prev) => (prev ? [...prev, meeting] : [meeting]));
  };

  const onMeetingDeleted = (meetingId: string) => {
    setMeetings((prev) =>
      prev ? prev.filter((meeting) => meeting.id !== meetingId) : prev,
    );
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const { recent, upcoming, past } = groupMeetings(meetings ?? [], now);

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
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full p-1 hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <Avatar
                avatarUrl={profile?.avatarUrl ?? null}
                name={profile?.name ?? session.email ?? '?'}
                size="sm"
              />
              <span className="text-sm font-medium text-foreground">
                {profile?.name}
              </span>
            </Link>
            <CreateMeetingModal onCreated={onMeetingCreated} />
            <Button variant="outline" onPress={logout}>
              Выйти
            </Button>
          </div>
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

        <RecentMeetingsSection meetings={recent} onDeleted={onMeetingDeleted} />

        <UpcomingMeetingsSection
          meetings={upcoming}
          onDeleted={onMeetingDeleted}
        />

        <PastMeetingsSection
          meetings={past}
          userId={session.userId}
          onDeleted={onMeetingDeleted}
        />
      </div>
    </div>
  );
}
