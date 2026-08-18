export class GetMeetingByIdQuery {
  constructor(
    public readonly id: string,
    public readonly organizerId: string,
  ) {}
}
