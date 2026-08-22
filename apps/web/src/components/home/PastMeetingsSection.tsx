import { Card } from '@heroui/react';
import type { Meeting } from '@/lib/meeting-api';
import { PastMeetingRow } from './PastMeetingRow';

export function PastMeetingsSection({
  meetings,
  token,
  userId,
  onDeleted,
}: {
  meetings: Meeting[];
  token: string;
  userId: string | null;
  onDeleted: (meetingId: string) => void;
}) {
  if (meetings.length === 0) return null;

  return (
    <Card>
      <Card.Header>
        <Card.Title>Прошедшие встречи</Card.Title>
        <Card.Description>
          Всего: {meetings.length}. Перетащите файл на встречу, чтобы
          прикрепить запись или другие материалы.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-3">
        {meetings.map((meeting) => (
          <PastMeetingRow
            key={meeting.id}
            meeting={meeting}
            token={token}
            userId={userId}
            onDeleted={onDeleted}
          />
        ))}
      </Card.Content>
    </Card>
  );
}
