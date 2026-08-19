'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconCalendar,
  Spinner,
} from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetings, type Meeting } from '@/lib/meeting-api';
import {
  deleteMeetingFile,
  downloadMeetingFile,
  getMeetingFiles,
  type MeetingFile,
} from '@/lib/meeting-file-api';
import {
  clearAccessToken,
  getAccessToken,
  getEmailFromToken,
  getUserIdFromToken,
} from '@/lib/session';
import { BrandIcon } from '@/components/BrandIcon';
import { CreateMeetingModal } from '@/components/CreateMeetingModal';
import { DeleteMeetingButton } from '@/components/DeleteMeetingButton';
import { FileCard } from '@/components/FileCard';
import { FileUploadForm } from '@/components/FileUploadForm';
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
  token,
  onDeleted,
  highlighted,
}: {
  meeting: Meeting;
  token: string;
  onDeleted: (meetingId: string) => void;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${highlighted ? 'bg-accent-soft' : 'bg-default'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{meeting.title}</p>
        <DeleteMeetingButton
          meeting={meeting}
          token={token}
          onDeleted={onDeleted}
        />
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <IconCalendar className="size-4 shrink-0" />
        <span>{formatMeetingDate(meeting.date)}</span>
      </div>
      {meeting.description ? (
        <p className="mt-1 text-sm text-muted">{meeting.description}</p>
      ) : null}
      {meeting.participants.length > 0 ? (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <UsersIcon className="size-4 shrink-0" />
          <span className="truncate">{meeting.participants.join(', ')}</span>
        </div>
      ) : null}
    </div>
  );
}

function PastMeetingRow({
  meeting,
  token,
  userId,
  onDeleted,
}: {
  meeting: Meeting;
  token: string;
  userId: string | null;
  onDeleted: (meetingId: string) => void;
}) {
  const [files, setFiles] = useState<MeetingFile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMeetingFiles(token, meeting.id)
      .then(setFiles)
      .finally(() => setLoaded(true));
  }, [token, meeting.id]);

  return (
    <div className="rounded-xl bg-default p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{meeting.title}</p>
        <DeleteMeetingButton
          meeting={meeting}
          token={token}
          onDeleted={onDeleted}
        />
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <IconCalendar className="size-4 shrink-0" />
        <span>{formatMeetingDate(meeting.date)}</span>
      </div>
      {meeting.description ? (
        <p className="mt-1 text-sm text-muted">{meeting.description}</p>
      ) : null}
      {meeting.participants.length > 0 ? (
        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <UsersIcon className="size-4 shrink-0" />
          <span className="truncate">{meeting.participants.join(', ')}</span>
        </div>
      ) : null}

      {loaded ? (
        <div className="mt-3 flex flex-col gap-3">
          <FileCard
            files={files}
            canDelete={meeting.organizerId === userId}
            onDownload={(file) =>
              downloadMeetingFile(token, meeting.id, file.id, file.filename)
            }
            onDelete={async (file) => {
              await deleteMeetingFile(token, meeting.id, file.id);
              setFiles((prev) => prev.filter((f) => f.id !== file.id));
            }}
            compact
          />

          <FileUploadForm
            token={token}
            meetingId={meeting.id}
            filesCount={files.length}
            onUploaded={(file) => setFiles((prev) => [file, ...prev])}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}

type Session = { token: string; email: string | null; userId: string | null };

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState<number>(() => Date.now());

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }

    // localStorage — внешнее (browser-only) хранилище, недоступное при SSR,
    // поэтому токен можно прочитать только на клиенте внутри эффекта.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession({
      token,
      email: getEmailFromToken(token),
      userId: getUserIdFromToken(token),
    });
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

  const recentMeetings = meetings
    ? [...meetings]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, RECENT_MEETINGS_COUNT)
    : [];

  const upcomingMeetings = meetings
    ? meetings
        .filter((meeting) => new Date(meeting.date).getTime() >= now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const pastMeetings = meetings
    ? meetings
        .filter((meeting) => new Date(meeting.date).getTime() < now)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
          <div className="flex items-center gap-2">
            <CreateMeetingModal
              token={session.token}
              onCreated={onMeetingCreated}
            />
            <Button variant="outline" onPress={onLogout}>
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
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  token={session.token}
                  onDeleted={onMeetingDeleted}
                  highlighted
                />
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {upcomingMeetings.length > 0 ? (
          <Card>
            <Card.Header>
              <Card.Title>Предстоящие встречи</Card.Title>
              <Card.Description>
                Всего: {upcomingMeetings.length}
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              {upcomingMeetings.map((meeting) => (
                <MeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  token={session.token}
                  onDeleted={onMeetingDeleted}
                />
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {pastMeetings.length > 0 ? (
          <Card>
            <Card.Header>
              <Card.Title>Прошедшие встречи</Card.Title>
              <Card.Description>
                Всего: {pastMeetings.length}. Перетащите файл на встречу, чтобы
                прикрепить запись или другие материалы.
              </Card.Description>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              {pastMeetings.map((meeting) => (
                <PastMeetingRow
                  key={meeting.id}
                  meeting={meeting}
                  token={session.token}
                  userId={session.userId}
                  onDeleted={onMeetingDeleted}
                />
              ))}
            </Card.Content>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
