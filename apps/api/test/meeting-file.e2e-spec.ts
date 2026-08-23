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

  const uploadFile = (
    token: string,
    filename: string,
    content: string,
  ): request.Test =>
    request(app.getHttpServer())
      .post(`/meetings/${meetingId}/files`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(content), {
        filename,
        contentType: 'text/plain',
      });

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

  describe('POST /meetings/:id/files', () => {
    it('uploads a file and stores its metadata', async () => {
      const res = await uploadFile(ownerToken, 'notes.txt', fileContent).expect(
        201,
      );

      const body = res.body as MeetingFileResponseBody;
      expect(body.meetingId).toBe(meetingId);
      expect(body.filename).toBe('notes.txt');
      expect(body.mimeType).toBe('text/plain');
      expect(body.size).toBe(Buffer.byteLength(fileContent));
      expect(typeof body.uploadedAt).toBe('string');
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
        .attach('file', Buffer.from(fileContent), 'notes.txt')
        .expect(401);
    });

    it('returns 404 when the meeting does not exist', async () => {
      await request(app.getHttpServer())
        .post('/meetings/00000000-0000-0000-0000-000000000000/files')
        .set('Authorization', `Bearer ${ownerToken}`)
        .attach('file', Buffer.from(fileContent), 'notes.txt')
        .expect(404);
    });

    it('returns 403 when requested by a user other than the organizer', async () => {
      await uploadFile(strangerToken, 'notes.txt', fileContent).expect(403);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(0);
    });

    it('adds a second file alongside the first instead of replacing it', async () => {
      const firstRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const firstBody = firstRes.body as MeetingFileResponseBody;

      const newContent = 'updated meeting notes';
      const secondRes = await uploadFile(
        ownerToken,
        'updated-notes.txt',
        newContent,
      ).expect(201);
      const secondBody = secondRes.body as MeetingFileResponseBody;

      expect(secondBody.id).not.toBe(firstBody.id);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(2);
    });

    it('rejects an 11th file once the meeting already has 10', async () => {
      for (let i = 0; i < 10; i += 1) {
        await uploadFile(ownerToken, `notes-${i}.txt`, fileContent).expect(201);
      }

      await uploadFile(ownerToken, 'notes-10.txt', fileContent).expect(409);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(10);
    });

    it('rejects a file exceeding the size limit and does not store it', async () => {
      const oversizedContent = Buffer.alloc(100 * 1024 * 1024 + 1);

      await request(app.getHttpServer())
        .post(`/meetings/${meetingId}/files`)
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

  describe('GET /meetings/:id/files', () => {
    it('returns the uploaded files, most recent first', async () => {
      await uploadFile(ownerToken, 'notes.txt', fileContent).expect(201);
      await uploadFile(ownerToken, 'notes-2.txt', 'second file').expect(201);

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as MeetingFileResponseBody[];
      expect(body).toHaveLength(2);
      expect(body[0].filename).toBe('notes-2.txt');
      expect(body[1].filename).toBe('notes.txt');
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .expect(401);
    });

    it('returns an empty list when the meeting has no uploaded files', async () => {
      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 403 when requested by a user other than the organizer', async () => {
      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);
    });
  });

  describe('DELETE /meetings/:id/files/:fileId', () => {
    it('deletes the file when requested by the meeting organizer', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${fileId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(0);

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('deletes only the targeted file, leaving the others attached', async () => {
      const firstRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const firstFileId = (firstRes.body as MeetingFileResponseBody).id;
      await uploadFile(ownerToken, 'notes-2.txt', 'second file').expect(201);

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${firstFileId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(204);

      const prisma = app.get(PrismaService);
      const remaining = await prisma.meetingFile.findMany({
        where: { meetingId },
      });
      expect(remaining).toHaveLength(1);
      expect(remaining[0].filename).toBe('notes-2.txt');
    });

    it('returns 403 when requested by a user other than the organizer', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${fileId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);

      const prisma = app.get(PrismaService);
      const count = await prisma.meetingFile.count({ where: { meetingId } });
      expect(count).toBe(1);
    });

    it('returns 401 when no auth token is provided', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      await request(app.getHttpServer())
        .delete(`/meetings/${meetingId}/files/${fileId}`)
        .expect(401);
    });

    it('returns 404 when the file does not exist', async () => {
      await request(app.getHttpServer())
        .delete(
          `/meetings/${meetingId}/files/00000000-0000-0000-0000-000000000000`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });
  });

  describe('GET /meetings/:id/files/:fileId/download', () => {
    it('downloads the previously uploaded file with matching content', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['content-disposition']).toContain('notes.txt');
      expect(res.text).toBe(fileContent);
    });

    it('returns 401 when no auth token is provided', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .expect(401);
    });

    it('returns 404 when the file does not exist', async () => {
      await request(app.getHttpServer())
        .get(
          `/meetings/${meetingId}/files/00000000-0000-0000-0000-000000000000/download`,
        )
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('returns 403 when requested by a user other than the organizer', async () => {
      const uploadRes = await uploadFile(
        ownerToken,
        'notes.txt',
        fileContent,
      ).expect(201);
      const fileId = (uploadRes.body as MeetingFileResponseBody).id;

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}/files/${fileId}/download`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);
    });
  });
});
