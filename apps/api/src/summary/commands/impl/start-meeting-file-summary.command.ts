export class StartMeetingFileSummaryCommand {
  constructor(
    public readonly meetingFileId: string,
    public readonly transcriptText: string,
  ) {}
}
