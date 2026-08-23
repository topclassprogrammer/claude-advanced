import { IconCalendar } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { formatMeetingDate } from '@/lib/format-meeting-date';
import { DeleteMeetingButton } from '@/components/DeleteMeetingButton';
import { UsersIcon } from '@/components/icons/UsersIcon';

export function MeetingRow({
  meeting,
  onDeleted,
  highlighted,
}: {
  meeting: Meeting;
  onDeleted: (meetingId: string) => void;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ${highlighted ? 'bg-accent-soft' : 'bg-default'}`}
    >
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
    </div>
  );
}
