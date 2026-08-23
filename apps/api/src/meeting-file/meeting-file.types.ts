import {
  MeetingFile,
  MeetingFileTranscription,
} from '../../generated/prisma/client';
import {
  MeetingFileTranscriptionRecord,
  toMeetingFileTranscriptionRecord,
} from '../transcription/transcription.types';

export type MeetingFileWithTranscription = MeetingFile & {
  transcription?: MeetingFileTranscription | null;
};

/** Публичное представление MeetingFile — без storagePath (абсолютный путь на диске сервера). */
export interface MeetingFileRecord {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  transcription: MeetingFileTranscriptionRecord | null;
}

export function toMeetingFileRecord(
  file: MeetingFileWithTranscription,
): MeetingFileRecord {
  return {
    id: file.id,
    meetingId: file.meetingId,
    filename: file.filename,
    size: file.size,
    mimeType: file.mimeType,
    uploadedAt: file.uploadedAt,
    transcription: file.transcription
      ? toMeetingFileTranscriptionRecord(file.transcription)
      : null,
  };
}
