'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Alert, IconCalendar, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetingById, type Meeting } from '@/lib/meeting-api';
import {
  deleteMeetingFile,
  downloadMeetingFile,
  getMeetingFile,
  type MeetingFile,
} from '@/lib/meeting-file-api';
import { getAccessToken, getUserIdFromToken } from '@/lib/session';
import { FileCard } from '@/components/FileCard';
import { FileUploadForm } from '@/components/FileUploadForm';
import { UsersIcon } from '@/components/icons/UsersIcon';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatMeetingDate(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : dateFormatter.format(parsed);
}

export default function MeetingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const meetingId = params.id;

  const [token, setToken] = useState<string | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [file, setFile] = useState<MeetingFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = getAccessToken();
    if (!storedToken) {
      router.replace('/auth/login');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    Promise.all([
      getMeetingById(token, meetingId),
      getMeetingFile(token, meetingId),
    ])
      .then(([meetingResult, fileResult]) => {
        setMeeting(meetingResult);
        setFile(fileResult);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      })
      .finally(() => setLoading(false));
  }, [token, meetingId]);

  if (!token || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen justify-center px-4 py-10">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <Link href="/" className="text-sm text-muted hover:underline">
          ← Ко всем встречам
        </Link>

        {error ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>Не удалось загрузить встречу</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        ) : null}

        {meeting ? (
          <>
            <header className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-foreground">
                {meeting.title}
              </h1>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <IconCalendar className="size-4 shrink-0" />
                <span>{formatMeetingDate(meeting.date)}</span>
              </div>
              {meeting.participants.length > 0 ? (
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <UsersIcon className="size-4 shrink-0" />
                  <span>{meeting.participants.join(', ')}</span>
                </div>
              ) : null}
            </header>

            <FileCard
              file={file}
              canDelete={
                !!file && meeting.organizerId === getUserIdFromToken(token)
              }
              onDownload={
                file
                  ? () => downloadMeetingFile(token, meetingId, file.filename)
                  : async () => {}
              }
              onDelete={async () => {
                await deleteMeetingFile(token, meetingId);
                setFile(null);
              }}
            />

            <FileUploadForm
              token={token}
              meetingId={meetingId}
              onUploaded={setFile}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
