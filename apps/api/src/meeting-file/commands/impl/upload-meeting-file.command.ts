export class UploadMeetingFileCommand {
  constructor(
    public readonly meetingId: string,
    public readonly file: Express.Multer.File,
    public readonly requesterId: string,
  ) {}
}
