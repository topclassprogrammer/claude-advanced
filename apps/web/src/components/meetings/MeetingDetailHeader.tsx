'use client';

import { useEffect, useRef, useState } from 'react';
import type { Meeting } from '@/lib/meeting-api';
import { getMeetingFileObjectUrl, type MeetingFile } from '@/lib/meeting-file-api';
import { DeleteMeetingButton } from '@/components/DeleteMeetingButton';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { CalendarIcon } from '@/components/icons/CalendarIcon';
import { ClockIcon } from '@/components/icons/ClockIcon';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { ShareIcon } from '@/components/icons/ShareIcon';
import { UsersIcon } from '@/components/icons/UsersIcon';

const dateOnlyFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' });
const timeOnlyFormatter = new Intl.DateTimeFormat('ru-RU', { timeStyle: 'short' });

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Реальное воспроизведение через нативный <audio>, если у встречи есть mp4/mp3-файл (blob-URL, т.к. скачивание требует Bearer-заголовок). */
function MeetingAudioPlayer({ meetingId, file }: { meetingId: string; file: MeetingFile }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    getMeetingFileObjectUrl(meetingId, file.id).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      createdUrl = url;
      setObjectUrl(url);
    });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [meetingId, file.id]);

  return (
    <>
      <audio
        ref={audioRef}
        src={objectUrl ?? undefined}
        onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
      <AudioPlayer
        playing={playing}
        onTogglePlay={() => {
          if (!audioRef.current) return;
          if (playing) audioRef.current.pause();
          else audioRef.current.play();
          setPlaying((v) => !v);
        }}
        elapsed={formatSeconds(elapsed)}
        total={formatSeconds(duration)}
        speedLabel="1×"
        progress={duration > 0 ? elapsed / duration : 0}
      />
    </>
  );
}

export function MeetingDetailHeader({
  meeting,
  files,
  canDelete,
  onDeleted,
  onBack,
}: {
  meeting: Meeting;
  files: MeetingFile[];
  canDelete: boolean;
  onDeleted: (meetingId: string) => void;
  onBack: () => void;
}) {
  const processed = files.some((file) => file.summary?.status === 'COMPLETED');
  const playableFile = files.find(
    (file) => file.mimeType.startsWith('audio/') || file.mimeType.startsWith('video/'),
  );
  const date = new Date(meeting.date);
  const isValidDate = !Number.isNaN(date.getTime());

  return (
    <div className="flex flex-col gap-4.5 rounded-card border border-border bg-surface p-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 self-start text-label text-muted lg:hidden"
      >
        <ChevronDownIcon width={14} height={14} className="rotate-90" />
        Ко всем встречам
      </button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {processed ? (
              <span className="rounded-chip bg-success-soft px-2 py-0.5 text-label text-success">
                Обработана
              </span>
            ) : null}
          </div>
          <h1 className="text-heading-l text-foreground">{meeting.title}</h1>
          {meeting.description ? (
            <p className="text-body text-muted">{meeting.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled
            title="Скоро"
            className="flex h-[34px] items-center gap-1.5 rounded-control border border-border px-3 text-label text-muted opacity-50"
          >
            <ShareIcon width={15} height={15} />
            Поделиться
          </button>
          {canDelete ? <DeleteMeetingButton meeting={meeting} onDeleted={onDeleted} /> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4.5 text-body-s text-muted">
        {isValidDate ? (
          <>
            <span className="flex items-center gap-1.5">
              <CalendarIcon width={15} height={15} />
              {dateOnlyFormatter.format(date)}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon width={15} height={15} />
              {timeOnlyFormatter.format(date)}
            </span>
          </>
        ) : null}
        {meeting.participants.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <UsersIcon width={15} height={15} />
            {meeting.participants.length} участник
            {meeting.participants.length === 1 ? '' : meeting.participants.length < 5 ? 'а' : 'ов'}
          </span>
        ) : null}
      </div>

      {playableFile ? <MeetingAudioPlayer meetingId={meeting.id} file={playableFile} /> : null}
    </div>
  );
}
