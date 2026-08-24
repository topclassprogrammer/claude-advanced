export class ProcessMeetingFileSummaryCommand {
  constructor(
    public readonly meetingFileId: string,
    public readonly transcriptText: string,
  ) {}
}
