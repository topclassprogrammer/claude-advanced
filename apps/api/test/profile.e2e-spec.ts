import { existsSync } from 'fs';
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
  avatarUrl: string | null;
}

describe('Profile (e2e)', () => {
  let app: INestApplication<App>;

  const user = { email: 'jane.doe@example.com', password: 'password123' };

  let userToken: string;

  const uploadAvatar = (
    token: string,
    filename: string,
    content: Buffer,
    contentType: string,
  ): request.Test =>
    request(app.getHttpServer())
      .post('/users/me/avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('avatar', content, { filename, contentType });

  const getAvatarPath = async (): Promise<string | null> => {
    const prisma = app.get(PrismaService);
    const dbUser = await prisma.user.findUniqueOrThrow({
      where: { email: user.email },
    });
    return dbUser.avatarPath;
  };

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
      expect(body.avatarUrl).toBeNull();
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

  describe('POST /users/me/avatar', () => {
    it('uploads an avatar and reflects it in the profile', async () => {
      const res = await uploadAvatar(
        userToken,
        'avatar.png',
        Buffer.from('fake-png-bytes'),
        'image/png',
      ).expect(200);

      const body = res.body as ProfileResponseBody;
      expect(body.avatarUrl).toBe('/users/me/avatar');

      const profileRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect((profileRes.body as ProfileResponseBody).avatarUrl).toBe(
        '/users/me/avatar',
      );
    });

    it('rejects an unsupported MIME type and does not store it', async () => {
      await uploadAvatar(
        userToken,
        'avatar.txt',
        Buffer.from('hello'),
        'text/plain',
      ).expect(400);

      expect(await getAvatarPath()).toBeNull();
    });

    it('rejects a file exceeding the 5MB size limit and does not store it', async () => {
      const oversizedContent = Buffer.alloc(5 * 1024 * 1024 + 1);

      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('avatar', oversizedContent, {
          filename: 'huge.png',
          contentType: 'image/png',
        })
        .expect(413);

      expect(await getAvatarPath()).toBeNull();
    }, 30000);

    it('replaces the previous avatar and removes the old file from disk', async () => {
      await uploadAvatar(
        userToken,
        'avatar.png',
        Buffer.from('first-avatar'),
        'image/png',
      ).expect(200);
      const firstPath = await getAvatarPath();
      expect(firstPath).not.toBeNull();
      expect(existsSync(firstPath!)).toBe(true);

      await uploadAvatar(
        userToken,
        'avatar-2.png',
        Buffer.from('second-avatar'),
        'image/png',
      ).expect(200);
      const secondPath = await getAvatarPath();
      expect(secondPath).not.toBeNull();
      expect(secondPath).not.toBe(firstPath);
      expect(existsSync(firstPath!)).toBe(false);
      expect(existsSync(secondPath!)).toBe(true);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .post('/users/me/avatar')
        .attach('avatar', Buffer.from('fake-png-bytes'), {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(401);
    });
  });

  describe('DELETE /users/me/avatar', () => {
    it('removes the avatar, deletes the file from disk and reverts to the placeholder', async () => {
      await uploadAvatar(
        userToken,
        'avatar.png',
        Buffer.from('fake-png-bytes'),
        'image/png',
      ).expect(200);
      const avatarPath = await getAvatarPath();
      expect(avatarPath).not.toBeNull();

      await request(app.getHttpServer())
        .delete('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(204);

      expect(await getAvatarPath()).toBeNull();
      expect(existsSync(avatarPath!)).toBe(false);

      const profileRes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
      expect((profileRes.body as ProfileResponseBody).avatarUrl).toBeNull();
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer()).delete('/users/me/avatar').expect(401);
    });
  });

  describe('PATCH /users/me/password', () => {
    it('changes the password and allows logging in with the new one', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: user.password, newPassword: 'new-password123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'new-password123' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(401);
    });

    it('rejects the change when the old password is incorrect', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: 'wrong-password', newPassword: 'new-password123' })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: user.password })
        .expect(200);
    });

    it('returns 400 when the new password is empty', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: user.password, newPassword: '' })
        .expect(400);
    });

    it('returns 400 when the new password is too short', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ oldPassword: user.password, newPassword: '123' })
        .expect(400);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/password')
        .send({ oldPassword: user.password, newPassword: 'new-password123' })
        .expect(401);
    });
  });

  describe('GET /users/me/avatar', () => {
    it('serves the uploaded avatar bytes with a matching content type', async () => {
      await uploadAvatar(
        userToken,
        'avatar.png',
        Buffer.from('fake-png-bytes'),
        'image/png',
      ).expect(200);

      const res = await request(app.getHttpServer())
        .get('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('image/png');
      expect(res.body).toEqual(Buffer.from('fake-png-bytes'));
    });

    it('returns 404 when the user has no avatar', async () => {
      await request(app.getHttpServer())
        .get('/users/me/avatar')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('returns 401 when no auth token is provided', async () => {
      await request(app.getHttpServer()).get('/users/me/avatar').expect(401);
    });
  });
});
