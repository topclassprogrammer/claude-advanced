import { Card } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { MeetingRow } from './MeetingRow';

export function UpcomingMeetingsSection({
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
        <Card.Title>Предстоящие встречи</Card.Title>
        <Card.Description>Всего: {meetings.length}</Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {meetings.map((meeting) => (
          <MeetingRow
            key={meeting.id}
            meeting={meeting}
            token={token}
            onDeleted={onDeleted}
          />
        ))}
      </Card.Content>
    </Card>
  );
}
