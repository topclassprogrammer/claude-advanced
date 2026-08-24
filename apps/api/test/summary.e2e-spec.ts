import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { CLAUDE_SUMMARY_SERVICE } from './../src/summary/claude-summary.service';
import { WHISPER_TRANSCRIPTION_SERVICE } from './../src/transcription/whisper-transcription.service';

interface AuthResponseBody {
  accessToken: string;
}

interface MeetingResponseBody {
  id: string;
}

interface TranscriptionBody {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  text: string | null;
}

interface SummaryBody {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  summary: string | null;
  actionItems: { text: string; assignee: string | null }[];
  decisions: string[];
}

interface MeetingFileResponseBody {
  id: string;
  mimeType: string;
  transcription: TranscriptionBody | null;
  summary: SummaryBody | null;
}

const FAKE_TRANSCRIPT = 'this is the recognized speech';

class FakeWhisperTranscriptionService {
  shouldFail = false;

  transcribe(): Promise<string> {
    if (this.shouldFail) {
      return Promise.reject(new Error('whisper crashed'));
    }
    return Promise.resolve(FAKE_TRANSCRIPT);
  }
}

const DEFAULT_GENERATED_SUMMARY = {
  summary: 'The team agreed on the roadmap.',
  actionItems: [
    { text: 'Prepare the deck', assignee: 'Alice' },
    { text: 'Book the venue', assignee: null },
  ],
  decisions: ['Ship in Q3'],
};

class FakeClaudeSummaryService {
  shouldFail = false;
  result = DEFAULT_GENERATED_SUMMARY;

  generateSummary(): Promise<typeof DEFAULT_GENERATED_SUMMARY> {
    if (this.shouldFail) {
      return Promise.reject(new Error('claude api unavailable'));
    }
    return Promise.resolve(this.result);
  }
}

describe('Summary (e2e)', () => {
  let app: INestApplication<App>;
  let fakeWhisper: FakeWhisperTranscriptionService;
  let fakeClaude: FakeClaudeSummaryService;

  const owner = {
    email: 'summary-owner@example.com',
    password: 'password123',
  };
  const stranger = {
    email: 'summary-stranger@example.com',
    password: 'password123',
  };

  const meetingPayload = {
    title: 'Sprint planning',
    date: '2026-09-01T10:00:00.000Z',
    participants: ['alice@example.com'],
  };

  let ownerToken: string;
  let strangerToken: string;
  let meetingId: string;

  const uploadFile = (
    token: string,
    filename: string,
    contentType: string,
  ): request.Test =>
    request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('binary-ish content'), {
        filename,
        contentType,
      });

  const getFiles = async (
    token: string = ownerToken,
  ): Promise<MeetingFileResponseBody[]> => {
    const res = await request(app.getHttpServer())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body as MeetingFileResponseBody[];
  };

  const waitUntil = async (
    predicate: () => Promise<boolean>,
    timeoutMessage: string,
  ): Promise<void> => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      if (await predicate()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(timeoutMessage);
  };

  const waitForSummarySettled = async (
    fileId: string,
  ): Promise<SummaryBody> => {
    let settled: SummaryBody | undefined;
    await waitUntil(async () => {
      const files = await getFiles();
      const file = files.find((candidate) => candidate.id === fileId);
      if (
        file?.summary &&
        file.summary.status !== 'PENDING' &&
        file.summary.status !== 'PROCESSING'
      ) {
        settled = file.summary;
        return true;
      }
      return false;
    }, 'Summary did not settle in time');
    return settled!;
  };

  const waitForTranscriptionSettled = async (
    fileId: string,
  ): Promise<TranscriptionBody> => {
    let settled: TranscriptionBody | undefined;
    await waitUntil(async () => {
      const files = await getFiles();
      const file = files.find((candidate) => candidate.id === fileId);
      if (
        file?.transcription &&
        file.transcription.status !== 'PENDING' &&
        file.transcription.status !== 'PROCESSING'
      ) {
        settled = file.transcription;
        return true;
      }
      return false;
    }, 'Transcription did not settle in time');
    return settled!;
  };

  beforeEach(async () => {
    fakeWhisper = new FakeWhisperTranscriptionService();
    fakeClaude = new FakeClaudeSummaryService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WHISPER_TRANSCRIPTION_SERVICE)
      .useValue(fakeWhisper)
      .overrideProvider(CLAUDE_SUMMARY_SERVICE)
      .useValue(fakeClaude)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.summaryActionItem.deleteMany();
    await prisma.meetingFileSummary.deleteMany();
    await prisma.meetingFileTranscription.deleteMany();
    await prisma.meetingFile.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.user.deleteMany();

    const ownerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(owner)
      .expect(201);
    ownerToken = (ownerRes.body as AuthResponseBody).accessToken;

    const strangerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(stranger)
      .expect(201);
    strangerToken = (strangerRes.body as AuthResponseBody).accessToken;

    const meetingRes = await request(app.getHttpServer())
      .post('/meetings')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send(meetingPayload)
      .expect(201);
    meetingId = (meetingRes.body as MeetingResponseBody).id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('auto-starts summary generation once transcription completes and reaches COMPLETED', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    await waitForTranscriptionSettled(fileId);
    const summary = await waitForSummarySettled(fileId);

    expect(summary.status).toBe('COMPLETED');
    expect(summary.summary).toBe(DEFAULT_GENERATED_SUMMARY.summary);
    expect(summary.decisions).toEqual(DEFAULT_GENERATED_SUMMARY.decisions);
  });

  it('preserves a null assignee for an action item without a named owner', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    await waitForTranscriptionSettled(fileId);
    const summary = await waitForSummarySettled(fileId);

    expect(summary.actionItems).toEqual(
      expect.arrayContaining([
        { text: 'Prepare the deck', assignee: 'Alice' },
        { text: 'Book the venue', assignee: null },
      ]),
    );
  });

  it('reaches COMPLETED with explicit empty lists when there are no action items or decisions', async () => {
    fakeClaude.result = {
      summary: 'Quick sync, nothing else.',
      actionItems: [],
      decisions: [],
    };

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    await waitForTranscriptionSettled(fileId);
    const summary = await waitForSummarySettled(fileId);

    expect(summary.status).toBe('COMPLETED');
    expect(summary.actionItems).toEqual([]);
    expect(summary.decisions).toEqual([]);
  });

  it('reaches FAILED without leaking implementation details when Claude API fails', async () => {
    fakeClaude.shouldFail = true;

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    await waitForTranscriptionSettled(fileId);
    const summary = await waitForSummarySettled(fileId);

    expect(summary.status).toBe('FAILED');
    expect(summary.summary).toBeNull();
    expect(summary.actionItems).toEqual([]);
  });

  it('keeps the transcript text and a working file list after the summary fails', async () => {
    fakeClaude.shouldFail = true;

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    await waitForTranscriptionSettled(fileId);
    const summary = await waitForSummarySettled(fileId);
    expect(summary.status).toBe('FAILED');

    const files = await getFiles();
    const file = files.find((candidate) => candidate.id === fileId);
    expect(file?.transcription?.status).toBe('COMPLETED');
    expect(file?.transcription?.text).toBe(FAKE_TRANSCRIPT);
  });

  /**
   * FakeClaudeSummaryService stands in for the whole ClaudeSummaryService
   * (including AnthropicSummaryService's transcript truncation), so this
   * cannot exercise truncation itself — that's covered at the unit level in
   * anthropic-summary.service.spec.ts. This checks that the rest of the
   * pipeline (transcript persistence, command payload passing, DB writes)
   * doesn't choke on a transcript far longer than a typical meeting.
   */
  it('reaches COMPLETED end-to-end for an oversized transcript', async () => {
    const hugeTranscript = 'word '.repeat(50_000);
    fakeWhisper.transcribe = () => Promise.resolve(hugeTranscript);

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    const transcription = await waitForTranscriptionSettled(fileId);
    expect(transcription.text).toBe(hugeTranscript);
    const summary = await waitForSummarySettled(fileId);

    expect(summary.status).toBe('COMPLETED');
  });

  it('does not start summary generation when the transcription fails', async () => {
    fakeWhisper.shouldFail = true;

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    const transcription = await waitForTranscriptionSettled(fileId);
    expect(transcription.status).toBe('FAILED');

    // Give a potential (incorrect) background summary start a chance to run.
    await new Promise((resolve) => setTimeout(resolve, 200));
    const files = await getFiles();
    const file = files.find((candidate) => candidate.id === fileId);
    expect(file?.summary).toBeNull();

    const prisma = app.get(PrismaService);
    const count = await prisma.meetingFileSummary.count();
    expect(count).toBe(0);
  });

  it('removes the summary when its meeting file is deleted', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;
    await waitForTranscriptionSettled(fileId);
    await waitForSummarySettled(fileId);

    await request(app.getHttpServer())
      .delete(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const prisma = app.get(PrismaService);
    const summaryCount = await prisma.meetingFileSummary.count({
      where: { meetingFileId: fileId },
    });
    expect(summaryCount).toBe(0);
    const actionItemCount = await prisma.summaryActionItem.count();
    expect(actionItemCount).toBe(0);
  });

  it('returns 403 for a non-organizer trying to read summary status', async () => {
    await uploadFile(ownerToken, 'recording.mp3', 'audio/mpeg').expect(201);

    await request(app.getHttpServer())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });

  it('returns 404 for a non-existent meeting when reading its files', async () => {
    await request(app.getHttpServer())
      .get('/meetings/00000000-0000-0000-0000-000000000000/files')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(404);
  });
});
