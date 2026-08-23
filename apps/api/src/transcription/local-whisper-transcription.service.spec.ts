import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { mkdtemp, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalWhisperTranscriptionService } from './local-whisper-transcription.service';

jest.mock('child_process', () => ({ spawn: jest.fn() }));

const spawnMock = spawn as jest.MockedFunction<typeof spawn>;

class FakeChildProcess extends EventEmitter {
  stderr = new EventEmitter();
}

const waitForSpawnCall = async (): Promise<void> => {
  while (spawnMock.mock.calls.length === 0) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

describe('LocalWhisperTranscriptionService', () => {
  let service: LocalWhisperTranscriptionService;
  let fakeProcess: FakeChildProcess;

  beforeEach(() => {
    spawnMock.mockReset();
    service = new LocalWhisperTranscriptionService();
    fakeProcess = new FakeChildProcess();
    spawnMock.mockReturnValue(
      fakeProcess as unknown as ReturnType<typeof spawn>,
    );
  });

  it('returns the transcript written by the whisper CLI on success', async () => {
    const inputPath = join(await mkdtemp(join(tmpdir(), 'audio-')), 'clip.mp3');
    await writeFile(inputPath, 'fake audio bytes');

    const transcribePromise = service.transcribe(inputPath);
    await waitForSpawnCall();

    const cliArgs = spawnMock.mock.calls[0][1] as string[];
    const outputDir = cliArgs[6];
    await writeFile(join(outputDir, 'clip.txt'), '  hello world  \n');
    fakeProcess.emit('close', 0);

    await expect(transcribePromise).resolves.toBe('hello world');
  });

  it('rejects when the whisper CLI exits with a non-zero code', async () => {
    const inputPath = join(await mkdtemp(join(tmpdir(), 'audio-')), 'clip.mp3');
    await writeFile(inputPath, 'fake audio bytes');

    const transcribePromise = service.transcribe(inputPath);
    await waitForSpawnCall();
    fakeProcess.stderr.emit('data', Buffer.from('model failed'));
    fakeProcess.emit('close', 1);

    await expect(transcribePromise).rejects.toThrow(/model failed/);
  });

  it('rejects when the whisper CLI cannot be started', async () => {
    const inputPath = join(await mkdtemp(join(tmpdir(), 'audio-')), 'clip.mp3');
    await writeFile(inputPath, 'fake audio bytes');

    const transcribePromise = service.transcribe(inputPath);
    await waitForSpawnCall();
    fakeProcess.emit('error', new Error('command not found'));

    await expect(transcribePromise).rejects.toThrow('command not found');
  });
});
