'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Spinner } from '@heroui/react';
import { ApiError } from '@/lib/auth-api';
import { getMeetingById, type Meeting } from '@/lib/meeting-api';
import { getMeetingFiles } from '@/lib/meeting-file-api';
import { useMeetingFiles } from '@/hooks/useMeetingFiles';
import { CalendarDaysIcon } from '@/components/icons/CalendarDaysIcon';
import { MeetingDetailHeader } from '@/components/meetings/MeetingDetailHeader';
import { MeetingDetailTabs, type DetailTab } from '@/components/meetings/MeetingDetailTabs';
import { MeetingOverviewBody } from '@/components/meetings/MeetingOverviewBody';
import { MaterialsSection } from '@/components/meetings/MaterialsSection';

function EmptySelection() {
  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 text-muted">
      <CalendarDaysIcon width={28} height={28} />
      <p className="text-body-s">Выберите встречу слева, чтобы увидеть детали.</p>
    </div>
  );
}

/**
 * Обёртка задаёт `key={meetingId}` на месте использования — компонент
 * полностью перемонтируется при смене встречи, поэтому локальное состояние
 * (loading/tab/error) достаточно инициализировать один раз, без сброса
 * внутри эффекта.
 */
export function MeetingDetailColumn({
  meetingId,
  currentUserId,
  onMeetingDeleted,
  onBack,
}: {
  meetingId: string | null;
  currentUserId: string;
  onMeetingDeleted: (meetingId: string) => void;
  /** Кнопка «назад к списку» — видна только на узких экранах, где список и деталь не помещаются рядом. */
  onBack: () => void;
}) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(meetingId !== null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('overview');
  const { files, setFiles, handleDownload, handleDelete, handleUploaded } =
    useMeetingFiles(meetingId ?? '');
  const requestedMeetingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!meetingId || requestedMeetingIdRef.current === meetingId) return;
    requestedMeetingIdRef.current = meetingId;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  if (!meetingId) return <EmptySelection />;

  if (loading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert status="danger">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Не удалось загрузить встречу</Alert.Title>
          <Alert.Description>{error}</Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }

  if (!meeting) return null;

  const canDelete = meeting.organizerId === currentUserId;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
      <MeetingDetailHeader
        meeting={meeting}
        files={files}
        onBack={onBack}
        canDelete={canDelete}
        onDeleted={onMeetingDeleted}
      />

      <MeetingDetailTabs active={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <MeetingOverviewBody
          meetingId={meetingId}
          files={files}
          canDelete={canDelete}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onUploaded={handleUploaded}
          onShowFullTranscript={() => setTab('transcript')}
        />
      ) : null}

      {tab === 'transcript' ? (
        <div className="flex flex-col gap-4">
          {files.filter((file) => file.transcription).length === 0 ? (
            <p className="text-body-s text-muted">У файлов этой встречи нет транскрипта.</p>
          ) : (
            files
              .filter((file) => file.transcription)
              .map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col gap-2 rounded-card border border-border bg-surface p-5"
                >
                  <span className="text-heading-s text-foreground">{file.filename}</span>
                  {file.transcription?.status === 'COMPLETED' && file.transcription.text ? (
                    <p
                      className="whitespace-pre-wrap text-body-s text-foreground"
                      data-testid="transcription-text"
                    >
                      {file.transcription.text}
                    </p>
                  ) : (
                    <p className="text-body-s text-muted">
                      {file.transcription?.status === 'FAILED'
                        ? 'Не удалось распознать транскрипт.'
                        : 'Транскрипт ещё готовится.'}
                    </p>
                  )}
                </div>
              ))
          )}
        </div>
      ) : null}

      {tab === 'materials' ? (
        <MaterialsSection
          meetingId={meetingId}
          files={files}
          canDelete={canDelete}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onUploaded={handleUploaded}
        />
      ) : null}

      {tab === 'participants' ? (
        <div className="flex flex-col gap-2">
          {meeting.participants.length === 0 ? (
            <p className="text-body-s text-muted">Участники не указаны.</p>
          ) : (
            meeting.participants.map((participant, i) => (
              <div
                key={`${participant}-${i}`}
                className="flex items-center gap-3 rounded-block border border-border bg-surface p-3"
              >
                <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-label text-accent">
                  {participant.charAt(0).toUpperCase()}
                </span>
                <span className="text-body-s text-foreground">{participant}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
