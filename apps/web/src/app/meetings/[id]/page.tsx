'use client';

import { useParams } from 'next/navigation';
import { MeetingsScreen } from '@/components/meetings/MeetingsScreen';

export default function MeetingPage() {
  const params = useParams<{ id: string }>();
  return <MeetingsScreen initialMeetingId={params.id} />;
}
