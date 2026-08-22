'use client';

import { useEffect, useState } from 'react';
import {
  deleteMeetingFile,
  downloadMeetingFile,
  getMeetingFiles,
  type MeetingFile,
} from '@/lib/meeting-file-api';

export function useMeetingFiles(
  token: string,
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

    getMeetingFiles(token, meetingId)
      .then(setFiles)
      .finally(() => setLoaded(true));
  }, [autoLoad, token, meetingId]);

  const handleDownload = async (file: MeetingFile): Promise<void> => {
    await downloadMeetingFile(token, meetingId, file.id, file.filename);
  };

  const handleDelete = async (file: MeetingFile): Promise<void> => {
    await deleteMeetingFile(token, meetingId, file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  };

  const handleUploaded = (file: MeetingFile): void => {
    setFiles((prev) => [file, ...prev]);
  };

  return { files, setFiles, loaded, handleDownload, handleDelete, handleUploaded };
}
