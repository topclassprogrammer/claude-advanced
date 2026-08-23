import { MeetingFile } from '../../generated/prisma/client';

/** Публичное представление MeetingFile — без storagePath (абсолютный путь на диске сервера). */
export interface MeetingFileRecord {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export function toMeetingFileRecord(file: MeetingFile): MeetingFileRecord {
  return {
    id: file.id,
    meetingId: file.meetingId,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
  };
}
