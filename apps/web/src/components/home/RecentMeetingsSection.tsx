import { Card } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { MeetingRow } from './MeetingRow';

export function RecentMeetingsSection({
  meetings,
  token,
  onDeleted,
}: {
  meetings: Meeting[];
  token: string;
  onDeleted: (meetingId: string) => void;
}) {
  if (meetings.length === 0) return null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Последние встречи</Card.Title>
        <Card.Description>
          {meetings.length} самые свежие из ваших встреч
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {meetings.map((meeting) => (
          <MeetingRow
            key={meeting.id}
            meeting={meeting}
            token={token}
            onDeleted={onDeleted}
            highlighted
          />
        ))}
      </Card.Content>
    </Card>
  );
}
