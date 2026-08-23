export class StartMeetingFileTranscriptionCommand {
  constructor(
    public readonly meetingFileId: string,
    public readonly storagePath: string,
  ) {}
}
