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

function extractRefreshTokenCookie(setCookie: string[] | undefined) {
  return setCookie?.find((cookie) => cookie.startsWith('refreshToken='));
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
    await prisma.refreshToken.deleteMany();
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

    it('sets an httpOnly refresh token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const refreshTokenCookie = extractRefreshTokenCookie(
        res.headers['set-cookie'] as unknown as string[] | undefined,
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
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

    it('sets an httpOnly refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      const refreshTokenCookie = extractRefreshTokenCookie(
        res.headers['set-cookie'] as unknown as string[] | undefined,
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the authenticated user for a valid access token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);
      const { accessToken } = registerRes.body as AuthResponseBody;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toMatchObject({ email: credentials.email });
    });

    it('returns 401 when no access token is provided', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('ignores the refresh token cookie — only the access token header authenticates', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/auth/register').send(credentials).expect(201);

      // The agent's cookie jar now holds the refresh-token cookie, but no
      // Authorization header was set.
      await agent.get('/auth/me').expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('exchanges the refresh cookie for a new access token and rotates the cookie', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/auth/register').send(credentials).expect(201);

      const refreshRes = await agent.post('/auth/refresh').expect(200);
      const { accessToken: secondAccessToken } =
        refreshRes.body as AuthResponseBody;

      // Не сравнивается с firstAccessToken на неравенство: JWT детерминирован
      // (sub/email/iat/exp), и если оба выпущены в одну и ту же секунду,
      // строки совпадут байт-в-байт — это не баг, а особенность формата.
      expect(typeof secondAccessToken).toBe('string');
      expect(decodeJwtPayload(secondAccessToken)).toMatchObject({
        email: credentials.email,
      });

      const rotatedCookie = extractRefreshTokenCookie(
        refreshRes.headers['set-cookie'] as unknown as string[] | undefined,
      );
      expect(rotatedCookie).toBeDefined();

      await agent
        .get('/auth/me')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(200);
    });

    it('returns 401 when there is no refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('returns 401 for a garbage refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refreshToken=not-a-real-token')
        .expect(401);
    });

    it('tolerates an immediate repeat of the same refresh token (multi-tab race)', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send(credentials)
        .expect(201);
      const firstCookiePair = extractRefreshTokenCookie(
        registerRes.headers['set-cookie'] as unknown as string[] | undefined,
      )?.split(';')[0];
      expect(firstCookiePair).toBeDefined();

      // First refresh rotates the token.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookiePair!)
        .expect(200);

      // Re-presenting the already-rotated token immediately after (simulating
      // a second tab that raced the first) must still succeed.
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookiePair!)
        .expect(200);
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the refresh token so a subsequent refresh fails', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post('/auth/register').send(credentials).expect(201);

      await agent.post('/auth/logout').expect(204);

      await agent.post('/auth/refresh').expect(401);
    });

    it('does not error when there is no refresh cookie', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(204);
    });
  });
});
