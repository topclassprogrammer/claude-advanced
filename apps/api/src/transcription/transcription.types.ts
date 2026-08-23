import {
  MeetingFileTranscription,
  TranscriptionStatus,
} from '../../generated/prisma/client';

/** Публичное представление транскрипта — без errorMessage (диагностика). */
export interface MeetingFileTranscriptionRecord {
  status: TranscriptionStatus;
  text: string | null;
}

export function toMeetingFileTranscriptionRecord(
  transcription: MeetingFileTranscription,
): MeetingFileTranscriptionRecord {
  return {
    status: transcription.status,
    text: transcription.text,
  };
}
