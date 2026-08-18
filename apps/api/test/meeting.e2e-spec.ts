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
  title: string;
  date: string;
  participants: string[];
}

describe('Meeting (e2e)', () => {
  let app: INestApplication<App>;

  const owner = { email: 'owner@example.com', password: 'password123' };
  const stranger = { email: 'stranger@example.com', password: 'password123' };

  const meetingPayload = {
    title: 'Sprint planning',
    date: '2026-09-01T10:00:00.000Z',
    participants: ['alice@example.com', 'bob@example.com'],
  };

  let ownerToken: string;
  let strangerToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
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
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /meetings', () => {
    it('creates a new meeting for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(meetingPayload)
        .expect(201);

      const body = res.body as MeetingResponseBody;
      expect(typeof body.id).toBe('string');
      expect(body.title).toBe(meetingPayload.title);
      expect(new Date(body.date).toISOString()).toBe(meetingPayload.date);
      expect(body.participants).toEqual(meetingPayload.participants);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .send(meetingPayload)
        .expect(401);
    });

    it('returns 401 when the auth token is invalid', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', 'Bearer not-a-valid-token')
        .send(meetingPayload)
        .expect(401);
    });

    it('returns 400 when the title is missing', async () => {
      const { title, ...rest } = meetingPayload;
      void title;
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(rest)
        .expect(400);
    });

    it('returns 400 when the date is missing', async () => {
      const { date, ...rest } = meetingPayload;
      void date;
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(rest)
        .expect(400);
    });

    it('returns 400 when the date is not a valid date string', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...meetingPayload, date: 'not-a-date' })
        .expect(400);
    });

    it('returns 400 when participants is not an array', async () => {
      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ ...meetingPayload, participants: 'alice@example.com' })
        .expect(400);
    });
  });

  describe('GET /meetings', () => {
    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer()).get('/meetings').expect(401);
    });

    it('returns an empty list when the user has no meetings', async () => {
      const res = await request(app.getHttpServer())
        .get('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it("returns only the authenticated user's meetings", async () => {
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(meetingPayload)
        .expect(201);

      await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${strangerToken}`)
        .send({ ...meetingPayload, title: 'Someone else meeting' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as MeetingResponseBody[];
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe((created.body as MeetingResponseBody).id);
      expect(body[0].title).toBe(meetingPayload.title);
    });
  });

  describe('GET /meetings/:id', () => {
    it('returns the meeting by id for its owner', async () => {
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(meetingPayload)
        .expect(201);
      const meetingId = (created.body as MeetingResponseBody).id;

      const res = await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      const body = res.body as MeetingResponseBody;
      expect(body.id).toBe(meetingId);
      expect(body.title).toBe(meetingPayload.title);
      expect(body.participants).toEqual(meetingPayload.participants);
    });

    it('returns 401 when no auth token is provided', async () => {
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(meetingPayload)
        .expect(201);
      const meetingId = (created.body as MeetingResponseBody).id;

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .expect(401);
    });

    it('returns 404 when the meeting does not exist', async () => {
      await request(app.getHttpServer())
        .get('/meetings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);
    });

    it('returns 404 when the meeting belongs to another user', async () => {
      const created = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(meetingPayload)
        .expect(201);
      const meetingId = (created.body as MeetingResponseBody).id;

      await request(app.getHttpServer())
        .get(`/meetings/${meetingId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(404);
    });
  });
});
