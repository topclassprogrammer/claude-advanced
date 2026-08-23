import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
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

interface MeetingFileResponseBody {
  id: string;
  mimeType: string;
  transcription: TranscriptionBody | null;
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

describe('Transcription (e2e)', () => {
  let app: INestApplication<App>;
  let fakeWhisper: FakeWhisperTranscriptionService;

  const owner = {
    email: 'transcription-owner@example.com',
    password: 'password123',
  };
  const stranger = {
    email: 'transcription-stranger@example.com',
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

  const waitForTranscriptionSettled = async (
    fileId: string,
  ): Promise<TranscriptionBody> => {
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      const files = res.body as MeetingFileResponseBody[];
      const file = files.find((candidate) => candidate.id === fileId);
      if (
        file?.transcription &&
        file.transcription.status !== 'PENDING' &&
        file.transcription.status !== 'PROCESSING'
      ) {
        return file.transcription;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Transcription did not settle in time');
  };

  beforeEach(async () => {
    fakeWhisper = new FakeWhisperTranscriptionService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(WHISPER_TRANSCRIPTION_SERVICE)
      .useValue(fakeWhisper)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
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

  it('creates a PENDING transcription immediately after uploading an mp3 file', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const body = res.body as MeetingFileResponseBody;

    expect(body.transcription).not.toBeNull();
    expect(['PENDING', 'PROCESSING']).toContain(body.transcription?.status);
  });

  it('reaches COMPLETED with the recognized text after an mp4 upload succeeds', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp4',
      'video/mp4',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    const transcription = await waitForTranscriptionSettled(fileId);
    expect(transcription.status).toBe('COMPLETED');
    expect(transcription.text).toBe(FAKE_TRANSCRIPT);
  });

  it('reaches FAILED without leaking implementation details when whisper throws', async () => {
    fakeWhisper.shouldFail = true;

    const res = await uploadFile(
      ownerToken,
      'recording.mp3',
      'audio/mpeg',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;

    const transcription = await waitForTranscriptionSettled(fileId);
    expect(transcription.status).toBe('FAILED');
    expect(transcription.text).toBeNull();
  });

  it('does not create a transcription for non mp4/mp3 file types', async () => {
    const res = await uploadFile(
      ownerToken,
      'notes.pdf',
      'application/pdf',
    ).expect(201);
    const body = res.body as MeetingFileResponseBody;

    expect(body.transcription).toBeNull();

    const prisma = app.get(PrismaService);
    const count = await prisma.meetingFileTranscription.count();
    expect(count).toBe(0);
  });

  it('removes the transcription when its meeting file is deleted', async () => {
    const res = await uploadFile(
      ownerToken,
      'recording.mp4',
      'video/mp4',
    ).expect(201);
    const fileId = (res.body as MeetingFileResponseBody).id;
    await waitForTranscriptionSettled(fileId);

    await request(app.getHttpServer())
      .delete(`/meetings/${meetingId}/files/${fileId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(204);

    const prisma = app.get(PrismaService);
    const count = await prisma.meetingFileTranscription.count({
      where: { meetingFileId: fileId },
    });
    expect(count).toBe(0);
  });

  it('returns 403 for a non-organizer trying to read transcription status', async () => {
    await uploadFile(ownerToken, 'recording.mp3', 'audio/mpeg').expect(201);

    await request(app.getHttpServer())
      .get(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });
});
