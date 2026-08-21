export class UpdateProfileNameCommand {
  constructor(
    public readonly userId: string,
    public readonly name: string,
  ) {}
}
