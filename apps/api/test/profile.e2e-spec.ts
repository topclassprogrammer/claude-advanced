import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

interface ProfileResponseBody {
  email: string;
  name: string;
}

describe('Profile (e2e)', () => {
  let app: INestApplication<App>;

  const user = { email: 'jane.doe@example.com', password: 'password123' };

  let userToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.meeting.deleteMany();
    await prisma.user.deleteMany();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201);
    userToken = (registerRes.body as AuthResponseBody).accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/me', () => {
    it('returns the email and a default name derived from the email when name is not set', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = res.body as ProfileResponseBody;
      expect(body.email).toBe(user.email);
      expect(body.name).toBe('jane.doe');
    });

    it('returns the stored name once it has been set', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/name')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Jane Doe' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const body = res.body as ProfileResponseBody;
      expect(body.name).toBe('Jane Doe');
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('returns 401 when the auth token is invalid', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer not-a-valid-token')
        .expect(401);
    });
  });

  describe('PATCH /users/me/name', () => {
    it('updates the name of the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/name')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Jane Doe' })
        .expect(200);

      const body = res.body as ProfileResponseBody;
      expect(body.name).toBe('Jane Doe');
      expect(body.email).toBe(user.email);
    });

    it('returns 400 when the name is missing', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/name')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);
    });

    it('returns 400 when the name is empty', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/name')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: '' })
        .expect(400);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/name')
        .send({ name: 'Jane Doe' })
        .expect(401);
    });
  });
});
