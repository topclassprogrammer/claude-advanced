import { spawn } from 'child_process';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, extname, join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { WHISPER_MODEL } from './transcription.constants';
import { WhisperTranscriptionService } from './whisper-transcription.service';

/**
 * Оборачивает CLI официального пакета `openai-whisper` (`pip install
 * openai-whisper`), запускается как отдельный процесс — предполагается, что
 * `whisper` доступен в PATH хоста. Внешние API не используются.
 */
@Injectable()
export class LocalWhisperTranscriptionService implements WhisperTranscriptionService {
  private readonly logger = new Logger(LocalWhisperTranscriptionService.name);

  async transcribe(filePath: string): Promise<string> {
    const outputDir = await mkdtemp(join(tmpdir(), 'whisper-'));
    try {
      await this.runWhisperCli(filePath, outputDir);
      return await this.readTranscript(filePath, outputDir);
    } finally {
      await rm(outputDir, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }

  /**
   * `--verbose False` + forced UTF-8 stdout: on a non-UTF-8 system codepage
   * (e.g. Windows/cp1251) whisper's default per-segment console output can
   * hit a transcribed character outside that codepage, throwing
   * UnicodeEncodeError inside the CLI — which aborts the run and skips
   * writing the .txt result entirely, without ever reaching our stderr
   * handler (the traceback goes to whisper's own caught-exception path).
   */
  private runWhisperCli(filePath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const whisperProcess = spawn(
        'whisper',
        [
          filePath,
          '--model',
          WHISPER_MODEL,
          '--output_format',
          'txt',
          '--output_dir',
          outputDir,
          '--fp16',
          'False',
          '--verbose',
          'False',
        ],
        {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        },
      );

      let stderr = '';
      whisperProcess.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      whisperProcess.on('error', (error) => {
        this.logger.error(`Failed to start whisper process: ${error.message}`);
        reject(error);
      });

      whisperProcess.on('close', (exitCode) => {
        if (exitCode === 0) {
          resolve();
          return;
        }
        reject(new Error(`whisper exited with code ${exitCode}: ${stderr}`));
      });
    });
  }

  private async readTranscript(
    filePath: string,
    outputDir: string,
  ): Promise<string> {
    const transcriptFilename = `${basename(filePath, extname(filePath))}.txt`;
    const transcriptPath = join(outputDir, transcriptFilename);
    const transcript = await readFile(transcriptPath, 'utf8');
    return transcript.trim();
  }
}
