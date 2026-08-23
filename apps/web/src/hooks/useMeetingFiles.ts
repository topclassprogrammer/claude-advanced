'use client';

import { useEffect, useState } from 'react';
import {
  deleteMeetingFile,
  downloadMeetingFile,
  getMeetingFiles,
  isTranscriptionInProgress,
  type MeetingFile,
} from '@/lib/meeting-file-api';

const TRANSCRIPTION_POLL_INTERVAL_MS = 4000;

export function useMeetingFiles(
  meetingId: string,
  options?: { autoLoad?: boolean },
): {
  files: MeetingFile[];
  setFiles: React.Dispatch<React.SetStateAction<MeetingFile[]>>;
  loaded: boolean;
  handleDownload: (file: MeetingFile) => Promise<void>;
  handleDelete: (file: MeetingFile) => Promise<void>;
  handleUploaded: (file: MeetingFile) => void;
} {
  const autoLoad = options?.autoLoad ?? false;
  const [files, setFiles] = useState<MeetingFile[]>([]);
  const [loaded, setLoaded] = useState(!autoLoad);

  useEffect(() => {
    if (!autoLoad) return;

    getMeetingFiles(meetingId)
      .then(setFiles)
      .finally(() => setLoaded(true));
  }, [autoLoad, meetingId]);

  useEffect(() => {
    if (!files.some(isTranscriptionInProgress)) return;

    const intervalId = setInterval(() => {
      getMeetingFiles(meetingId)
        .then(setFiles)
        .catch(() => undefined);
    }, TRANSCRIPTION_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [files, meetingId]);

  const handleDownload = async (file: MeetingFile): Promise<void> => {
    await downloadMeetingFile(meetingId, file.id, file.filename);
  };

  const handleDelete = async (file: MeetingFile): Promise<void> => {
    await deleteMeetingFile(meetingId, file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const handleUploaded = (file: MeetingFile): void => {
    setFiles((prev) => [file, ...prev]);
  };

  return { files, setFiles, loaded, handleDownload, handleDelete, handleUploaded };
}
