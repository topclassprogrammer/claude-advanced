export const WHISPER_TRANSCRIPTION_SERVICE = Symbol(
  'WHISPER_TRANSCRIPTION_SERVICE',
);

export interface WhisperTranscriptionService {
  transcribe(filePath: string): Promise<string>;
}
