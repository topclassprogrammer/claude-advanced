'use client';

import { useMemo, useState } from 'react';
import type { Meeting } from '@/lib/meeting-api';
import { groupMeetings } from '@/lib/meeting-grouping';
import { MeetingListCard } from '@/components/meetings/MeetingListCard';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { ChevronDownIcon } from '@/components/icons/ChevronDownIcon';
import { CalendarIcon } from '@/components/icons/CalendarIcon';

const INITIAL_VISIBLE_COUNT = 6;
const monthFormatter = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' });

function monthGroupLabel(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  return monthFormatter.format(parsed).toUpperCase();
}

function groupByMonth(meetings: Meeting[]): { label: string; items: Meeting[] }[] {
  const groups: { label: string; items: Meeting[] }[] = [];
  for (const meeting of meetings) {
    const label = monthGroupLabel(meeting.date);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(meeting);
    } else {
      groups.push({ label, items: [meeting] });
    }
  }
  return groups;
}

type Segment = 'past' | 'upcoming' | 'drafts';

export function MeetingListColumn({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
}: {
  meetings: Meeting[];
  selectedMeetingId: string | null;
  onSelectMeeting: (meetingId: string) => void;
}) {
  const [segment, setSegment] = useState<Segment>('upcoming');
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [now] = useState(() => Date.now());
  const { upcoming, past } = useMemo(() => groupMeetings(meetings, now), [meetings, now]);

  const activeList = segment === 'past' ? past : segment === 'upcoming' ? upcoming : [];
  const visibleList = activeList.slice(0, visibleCount);
  const hiddenCount = activeList.length - visibleList.length;
  const groups = groupByMonth(visibleList);

  const onSegmentChange = (value: Segment) => {
    setSegment(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-y-auto lg:w-[344px] lg:shrink-0">
      <SegmentedControl
        value={segment}
        onChange={onSegmentChange}
        options={[
          { value: 'past', label: 'Прошедшие' },
          { value: 'upcoming', label: 'Предстоящие' },
          { value: 'drafts', label: 'Черновики' },
        ]}
      />

      {segment === 'drafts' ? (
        <p className="p-3 text-body-s text-muted">
          Черновики встреч скоро появятся здесь.
        </p>
      ) : meetings.length === 0 ? (
        <p className="p-3 text-body-s text-muted">У вас пока нет встреч.</p>
      ) : activeList.length === 0 ? (
        <p className="p-3 text-body-s text-muted">
          {segment === 'past' ? 'Прошедших встреч нет.' : 'Предстоящих встреч нет.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <span className="px-1 text-overline text-muted">{group.label}</span>
              <div className="flex flex-col gap-2">
                {group.items.map((meeting) => (
                  <MeetingListCard
                    key={meeting.id}
                    meeting={meeting}
                    selected={meeting.id === selectedMeetingId}
                    onSelect={() => onSelectMeeting(meeting.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + hiddenCount)}
              className="flex items-center justify-center gap-1.5 rounded-block border border-border bg-surface py-2.5 text-label text-muted"
            >
              Показать ещё {hiddenCount}{' '}
              {hiddenCount === 1 ? 'встречу' : hiddenCount < 5 ? 'встречи' : 'встреч'}
              <ChevronDownIcon width={14} height={14} />
            </button>
          ) : null}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1.5 rounded-block bg-accent-soft p-4">
        <div className="flex items-center gap-2 text-accent">
          <CalendarIcon width={16} height={16} />
          <span className="text-heading-s">Подключить календарь</span>
        </div>
        <p className="text-body-s text-muted">
          Встречи и записи будут добавляться автоматически.
        </p>
      </div>
    </div>
  );
}
