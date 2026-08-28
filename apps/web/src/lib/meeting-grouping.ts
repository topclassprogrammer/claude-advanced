import type { Meeting } from './meeting-api';

export type GroupedMeetings = {
  upcoming: Meeting[];
  past: Meeting[];
};

/** Делит встречи на «предстоящие» и «прошедшие» относительно `now`. */
export function groupMeetings(meetings: Meeting[], now: number): GroupedMeetings {
  const upcoming = meetings
    .filter((meeting) => new Date(meeting.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const past = meetings
    .filter((meeting) => new Date(meeting.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return { upcoming, past };
}
