import { Card } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { MeetingRow } from './MeetingRow';

export function UpcomingMeetingsSection({
  meetings,
  onDeleted,
}: {
  meetings: Meeting[];
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
          <MeetingRow key={meeting.id} meeting={meeting} onDeleted={onDeleted} />
        ))}
      </Card.Content>
    </Card>
  );
}
