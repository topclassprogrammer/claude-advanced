import { CommandBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../prisma/prisma.service';
import { WhisperTranscriptionService } from '../../whisper-transcription.service';
import { ProcessMeetingFileTranscriptionCommand } from '../impl/process-meeting-file-transcription.command';
import { ProcessMeetingFileTranscriptionHandler } from './process-meeting-file-transcription.handler';

describe('ProcessMeetingFileTranscriptionHandler', () => {
  let handler: ProcessMeetingFileTranscriptionHandler;
  let prisma: { meetingFileTranscription: { updateMany: jest.Mock } };
  let commandBus: { execute: jest.Mock };
  let whisperTranscriptionService: jest.Mocked<WhisperTranscriptionService>;

  beforeEach(() => {
    prisma = { meetingFileTranscription: { updateMany: jest.fn() } };
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    whisperTranscriptionService = {
      transcribe: jest.fn().mockResolvedValue('recognized speech'),
    };
    handler = new ProcessMeetingFileTranscriptionHandler(
      prisma as unknown as PrismaService,
      commandBus as unknown as CommandBus,
      whisperTranscriptionService,
    );
  });

  it('starts summary generation once the transcription is persisted as COMPLETED', async () => {
    prisma.meetingFileTranscription.updateMany.mockResolvedValue({
      count: 1,
    });

    await handler.execute(
      new ProcessMeetingFileTranscriptionCommand('file-1', '/tmp/file.mp3'),
    );

    expect(commandBus.execute).toHaveBeenCalledTimes(1);
  });

  it('does not start summary generation when the meeting file was deleted before COMPLETED could be written', async () => {
    prisma.meetingFileTranscription.updateMany.mockResolvedValue({
      count: 0,
    });

    await handler.execute(
      new ProcessMeetingFileTranscriptionCommand('file-1', '/tmp/file.mp3'),
    );

    expect(commandBus.execute).not.toHaveBeenCalled();
  });

  it('does not start summary generation when transcription fails', async () => {
    whisperTranscriptionService.transcribe.mockRejectedValue(
      new Error('whisper crashed'),
    );
    prisma.meetingFileTranscription.updateMany.mockResolvedValue({
      count: 1,
    });

    await handler.execute(
      new ProcessMeetingFileTranscriptionCommand('file-1', '/tmp/file.mp3'),
    );

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(prisma.meetingFileTranscription.updateMany).toHaveBeenLastCalledWith(
      {
        where: { meetingFileId: 'file-1' },
        data: { status: 'FAILED', errorMessage: 'whisper crashed' },
      },
    );
  });
});
