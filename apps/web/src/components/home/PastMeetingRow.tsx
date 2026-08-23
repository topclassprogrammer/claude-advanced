import { IconCalendar } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { formatMeetingDate } from '@/lib/format-meeting-date';
import { useMeetingFiles } from '@/hooks/useMeetingFiles';
import { DeleteMeetingButton } from '@/components/DeleteMeetingButton';
import { FileCard } from '@/components/FileCard';
import { FileUploadForm } from '@/components/FileUploadForm';
import { UsersIcon } from '@/components/icons/UsersIcon';

export function PastMeetingRow({
  meeting,
  userId,
  onDeleted,
}: {
  meeting: Meeting;
  userId: string | null;
  onDeleted: (meetingId: string) => void;
}) {
  const { files, loaded, handleDownload, handleDelete, handleUploaded } =
    useMeetingFiles(meeting.id, { autoLoad: true });

  return (
    <div className="rounded-xl bg-default p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">{meeting.title}</p>
        <DeleteMeetingButton meeting={meeting} onDeleted={onDeleted} />
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
            onDownload={handleDownload}
            onDelete={handleDelete}
            compact
          />

          <FileUploadForm
            meetingId={meeting.id}
            filesCount={files.length}
            onUploaded={handleUploaded}
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
