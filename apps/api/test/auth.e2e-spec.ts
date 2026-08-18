import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

interface AuthResponseBody {
  accessToken: string;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split('.');
  return JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Record<string, unknown>;
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  const credentials = { email: 'user@example.com', password: 'password123' };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates a new user and returns a JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const body = res.body as AuthResponseBody;
      expect(typeof body.accessToken).toBe('string');
      expect(decodeJwtPayload(body.accessToken)).toMatchObject({
        email: credentials.email,
      });
    });

    it('returns 409 when the email is already registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(409);
    });

    it('returns 400 for an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...credentials, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when the password is too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...credentials, password: '123' })
        .expect(400);
    });

    it('returns 400 when the email is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: credentials.password })
        .expect(400);
    });

    it('returns 400 when the password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: credentials.email })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns a JWT for a registered user with valid credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      const body = res.body as AuthResponseBody;
      expect(typeof body.accessToken).toBe('string');
      expect(decodeJwtPayload(body.accessToken)).toMatchObject({
        email: credentials.email,
      });
    });

    it('returns 401 for an email that has not been registered', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);
    });

    it('returns 401 for a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...credentials, password: 'wrong-password' })
        .expect(401);
    });

    it('returns 400 for an invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ ...credentials, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when the password is missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: credentials.email })
        .expect(400);
    });

    it('does not create a user as a side effect of a failed login', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      // if login had created the user, this registration would now fail with 409
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);
    });
  });
});
