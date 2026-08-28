import type { Meeting } from '@/lib/meeting-api';
import { formatMeetingDate } from '@/lib/format-meeting-date';

const AVATAR_COLORS = ['bg-accent', 'bg-success', 'bg-warning'];

/**
 * Строка встречи в списке (см. .pen «Составные блоки»/BFdsT «Component — Meeting
 * List Item» и node o5xFBj «App — Встречи»). В отличие от макета не показывает
 * длительность и чипы транскрипта/файлов/тега команды — этих данных нет в
 * `Meeting` без дорогого запроса файлов на каждую строку списка (см. план).
 */
export function MeetingListCard({
  meeting,
  selected = false,
  onSelect,
}: {
  meeting: Meeting;
  selected?: boolean;
  onSelect: () => void;
}) {
  const visibleParticipants = meeting.participants.slice(0, 3);
  const hiddenCount = meeting.participants.length - visibleParticipants.length;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col gap-2.5 rounded-block border bg-surface p-3.5 text-left ${
        selected
          ? 'border-accent border-[1.5px] shadow-[0_0_0_3px_var(--accent-soft)]'
          : 'border-border'
      }`}
    >
      <span className="truncate text-heading-s text-foreground">{meeting.title}</span>
      <span className="text-meta text-muted">{formatMeetingDate(meeting.date)}</span>
      {visibleParticipants.length > 0 ? (
        <div className="flex items-center -space-x-1.5">
          {visibleParticipants.map((participant, i) => (
            <span
              key={`${participant}-${i}`}
              className={`flex size-5 items-center justify-center rounded-full text-[9px] font-semibold text-white ring-2 ring-surface ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}
            >
              {participant.charAt(0).toUpperCase()}
            </span>
          ))}
          {hiddenCount > 0 ? (
            <span className="flex size-5 items-center justify-center rounded-full bg-default text-[9px] font-semibold text-muted ring-2 ring-surface">
              +{hiddenCount}
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
