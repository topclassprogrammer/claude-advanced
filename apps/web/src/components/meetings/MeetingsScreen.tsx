'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetings, type Meeting } from '@/lib/meeting-api';
import { getProfile, type Profile } from '@/lib/profile-api';
import { useSession } from '@/hooks/useSession';
import { AppSidebar } from '@/components/meetings/AppSidebar';
import { AppTopbar } from '@/components/meetings/AppTopbar';
import { MeetingListColumn } from '@/components/meetings/MeetingListColumn';
import { MeetingDetailColumn } from '@/components/meetings/MeetingDetailColumn';

/**
 * Главный экран приложения (см. design/VideoMeeting.pen, node o5xFBj «App —
 * Встречи»): сайдбар + топбар + список встреч + деталь-колонка выбранной
 * встречи в одном экране. Рендерится и из `/` (без выбранной встречи), и из
 * `/meetings/[id]` (с ней) — так обе страницы становятся одним экраном.
 */
export function MeetingsScreen({ initialMeetingId }: { initialMeetingId?: string }) {
  const { session, logout } = useSession();
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        // Сайдбар остаётся с email, если профиль не удалось загрузить.
      });
  }, [session]);

  const onMeetingCreated = (meeting: Meeting) => {
    setMeetings((prev) => (prev ? [...prev, meeting] : [meeting]));
    router.push(`/meetings/${meeting.id}`);
  };

  const onMeetingDeleted = (meetingId: string) => {
    setMeetings((prev) => (prev ? prev.filter((m) => m.id !== meetingId) : prev));
    if (meetingId === initialMeetingId) router.push('/');
  };

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar
        email={session.email}
        profile={profile}
        onMeetingCreated={onMeetingCreated}
        onLogout={logout}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          title="Все встречи"
          subtitle={session.email}
          onMeetingCreated={onMeetingCreated}
          onLogout={logout}
        />

        <div className="flex min-h-0 flex-1 gap-5 overflow-hidden px-6 py-5">
          {error ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Не удалось загрузить встречи</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
          ) : meetings === null ? (
            <div className="flex flex-1 items-center justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className={`min-w-0 ${initialMeetingId ? 'hidden lg:flex' : 'flex flex-1 lg:flex-none'}`}>
                <MeetingListColumn
                  meetings={meetings}
                  selectedMeetingId={initialMeetingId ?? null}
                  onSelectMeeting={(id) => router.push(`/meetings/${id}`)}
                />
              </div>
              <div className={`min-w-0 flex-1 ${initialMeetingId ? 'flex' : 'hidden lg:flex'}`}>
                <MeetingDetailColumn
                  key={initialMeetingId ?? 'none'}
                  meetingId={initialMeetingId ?? null}
                  currentUserId={session.userId}
                  onMeetingDeleted={onMeetingDeleted}
                  onBack={() => router.push('/')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
