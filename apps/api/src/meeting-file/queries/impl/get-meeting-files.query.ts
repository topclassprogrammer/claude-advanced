export class GetMeetingFilesQuery {
  constructor(
    public readonly meetingId: string,
    public readonly requesterId: string,
  ) {}
}
