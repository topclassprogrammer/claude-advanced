'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/auth-api';

export function useFileUpload<T>({
  validate,
  upload,
  onUploaded,
  defaultErrorMessage,
}: {
  validate: (file: File) => string | null;
  upload: (file: File, onProgress: (percent: number) => void) => Promise<T>;
  onUploaded: (result: T) => void;
  defaultErrorMessage: string;
}): {
  isDragging: boolean;
  uploading: boolean;
  currentFile: File | null;
  progress: number;
  error: string | null;
  handleDragOver: (event: React.DragEvent<HTMLLabelElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
} {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startUpload = async (file: File): Promise<void> => {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);
    setCurrentFile(file);
    setProgress(0);
    try {
      const result = await upload(file, setProgress);
      onUploaded(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : defaultErrorMessage);
    } finally {
      setUploading(false);
      setCurrentFile(null);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => setIsDragging(false);

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void startUpload(file);
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void startUpload(file);
  };

  return {
    isDragging,
    uploading,
    currentFile,
    progress,
    error,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleInputChange,
  };
}
