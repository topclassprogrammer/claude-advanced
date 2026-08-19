import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

interface MeetingResponseBody {
  id: string;
}

interface MeetingFileResponseBody {
  id: string;
  meetingId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

describe('MeetingFile (e2e)', () => {
  let app: INestApplication<App>;

  const owner = { email: 'file-owner@example.com', password: 'password123' };
  const stranger = {
    email: 'file-stranger@example.com',
    password: 'password123',
  };

  const meetingPayload = {
    title: 'Sprint planning',
    date: '2026-09-01T10:00:00.000Z',
    participants: ['alice@example.com'],
  };

  const fileContent = 'hello meeting notes';

  let ownerToken: string;
  let strangerToken: string;
  let meetingId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
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

  describe('POST /meetings/:id/file', () => {
    it('uploads a file and stores its metadata', async () => {
      const res = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const body = res.body as MeetingFileResponseBody;
      expect(body.meetingId).toBe(meetingId);
      expect(body.filename).toBe('notes.txt');
      expect(body.mimeType).toBe('text/plain');
      expect(body.size).toBe(Buffer.byteLength(fileContent));
      expect(typeof body.uploadedAt).toBe('string');
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .attach('file', Buffer.from(fileContent), 'notes.txt')
        .expect(401);
    });

    it('returns 404 when the meeting does not exist', async () => {
      await request(app.getHttpServer())
        .post('/meetings/00000000-0000-0000-0000-000000000000/file')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), 'notes.txt')
        .expect(404);
    });

    it('replaces the previously uploaded file on re-upload', async () => {
      const firstRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);
      const firstBody = firstRes.body as MeetingFileResponseBody;

      const newContent = 'updated meeting notes';
      const secondRes = await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(newContent), {
          filename: 'updated-notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);
      const secondBody = secondRes.body as MeetingFileResponseBody;

      // Same MeetingFile record (1:1 with the meeting), not a second row.
      expect(secondBody.id).toBe(firstBody.id);
      expect(secondBody.filename).toBe('updated-notes.txt');

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(1);

      const downloadRes = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);
      expect(downloadRes.text).toBe(newContent);
    });

    it('rejects a file exceeding the size limit and does not store it', async () => {
      const oversizedContent = Buffer.alloc(100 * 1024 * 1024 + 1);

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', oversizedContent, {
          filename: 'huge.bin',
          contentType: 'application/pdf',
        })
        .expect(413);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(0);
    }, 30000);
  });

  describe('GET /meetings/:id/file', () => {
    it('returns the uploaded file metadata', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as MeetingFileResponseBody;
      expect(body.filename).toBe('notes.txt');
      expect(body.size).toBe(Buffer.byteLength(fileContent));
      expect(body.mimeType).toBe('text/plain');
      expect(typeof body.uploadedAt).toBe('string');
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file`)
        .expect(401);
    });

    it('returns 404 when the meeting has no uploaded file', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('DELETE /meetings/:id/file', () => {
    it('deletes the file when requested by the meeting organizer', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(0);

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('returns 403 when requested by a user other than the organizer', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(1);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/file`)
        .expect(401);
    });

    it('returns 404 when the meeting has no uploaded file', async () => {
      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('GET /meetings/:id/file/download', () => {
    it('downloads the previously uploaded file with matching content', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/file`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), {
          filename: 'notes.txt',
          contentType: 'text/plain',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['content-disposition']).toContain('notes.txt');
      expect(res.text).toBe(fileContent);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file/download`)
        .expect(401);
    });

    it('returns 404 when the meeting has no uploaded file', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/file/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });
});
