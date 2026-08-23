'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, IconCalendar, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetingById, type Meeting } from '@/lib/meeting-api';
import { getMeetingFiles } from '@/lib/meeting-file-api';
import { formatMeetingDate } from '@/lib/format-meeting-date';
import { useSession } from '@/hooks/useSession';
import { useMeetingFiles } from '@/hooks/useMeetingFiles';
import { FileCard } from '@/components/FileCard';
import { FileUploadForm } from '@/components/FileUploadForm';
import { UsersIcon } from '@/components/icons/UsersIcon';

export default function MeetingPage() {
  const params = useParams<{ id: string }>();
  const meetingId = params.id;

  const { session } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { files, setFiles, handleDownload, handleDelete, handleUploaded } =
    useMeetingFiles(meetingId);

  useEffect(() => {
    if (!session) return;

    Promise.all([getMeetingById(meetingId), getMeetingFiles(meetingId)])
      .then(([meetingResult, filesResult]) => {
        setMeeting(meetingResult);
        setFiles(filesResult);
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Не удалось связаться с сервером. Попробуйте ещё раз.',
        );
      })
      .finally(() => setLoading(false));
  }, [session, meetingId, setFiles]);

  if (!session || loading) {
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
              files={files}
              canDelete={meeting.organizerId === session.userId}
              onDownload={handleDownload}
              onDelete={handleDelete}
            />

            <FileUploadForm
              meetingId={meetingId}
              filesCount={files.length}
              onUploaded={handleUploaded}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
