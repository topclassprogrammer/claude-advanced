export class ProcessMeetingFileTranscriptionCommand {
  constructor(
    public readonly meetingFileId: string,
    public readonly storagePath: string,
  ) {}
}
