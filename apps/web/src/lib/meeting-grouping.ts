import type { Meeting } from './meeting-api';

export const RECENT_MEETINGS_COUNT = 3;

export type GroupedMeetings = {
  recent: Meeting[];
  upcoming: Meeting[];
  past: Meeting[];
};

/** Делит встречи на «последние по created», «предстоящие» и «прошедшие» относительно `now`. */
export function groupMeetings(meetings: Meeting[], now: number): GroupedMeetings {
  const recent = [...meetings]
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, RECENT_MEETINGS_COUNT);

  const upcoming = meetings
    .filter((meeting) => new Date(meeting.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = meetings
    .filter((meeting) => new Date(meeting.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { recent, upcoming, past };
}
