import { CommandBus } from '@nestjs/cqrs';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StartMeetingFileSummaryCommand } from '../impl/start-meeting-file-summary.command';
import { StartMeetingFileSummaryHandler } from './start-meeting-file-summary.handler';

describe('StartMeetingFileSummaryHandler', () => {
  let handler: StartMeetingFileSummaryHandler;
  let prisma: { meetingFileSummary: { create: jest.Mock } };
  let commandBus: { execute: jest.Mock };

  beforeEach(() => {
    prisma = { meetingFileSummary: { create: jest.fn() } };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    handler = new StartMeetingFileSummaryHandler(
      prisma as unknown as PrismaService,
      commandBus as unknown as CommandBus,
    );
  });

  it('creates a PENDING summary record and fires off processing', async () => {
    const created = { id: 'summary-1', meetingFileId: 'file-1' };
    prisma.meetingFileSummary.create.mockResolvedValue(created);

    const result = await handler.execute(
      new StartMeetingFileSummaryCommand('file-1', 'transcript text'),
    );

    expect(result).toBe(created);
    expect(prisma.meetingFileSummary.create).toHaveBeenCalledWith({
      data: { meetingFileId: 'file-1' },
    });
    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('returns null without dispatching processing when the meeting file was deleted concurrently', async () => {
    const fkError = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint violated',
      { code: 'P2003', clientVersion: 'test' },
    );
    prisma.meetingFileSummary.create.mockRejectedValue(fkError);

    const result = await handler.execute(
      new StartMeetingFileSummaryCommand('file-1', 'transcript text'),
    );

    expect(result).toBeNull();
    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('rethrows unrelated database errors', async () => {
    prisma.meetingFileSummary.create.mockRejectedValue(new Error('boom'));

    await expect(
      handler.execute(
        new StartMeetingFileSummaryCommand('file-1', 'transcript text'),
      ),
    ).rejects.toThrow('boom');
  });
});
