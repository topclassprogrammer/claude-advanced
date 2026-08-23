import {
  CanActivate,
  Injectable,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MeetingModule } from './meeting/meeting.module';
import { MeetingFileModule } from './meeting-file/meeting-file.module';
import { ProfileModule } from './profile/profile.module';

/**
 * В e2e-тестах (NODE_ENV=test) каждый спек регистрирует нескольких
 * пользователей с одного IP в beforeEach — реальный ThrottlerGuard
 * ложится на лимит auth-роутов за пару тестовых файлов, поэтому в тестах
 * throttling отключается целиком.
 */
@Injectable()
class NoopThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    PrismaModule,
    AuthModule,
    MeetingModule,
    MeetingFileModule,
    ProfileModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    },
    {
      provide: APP_GUARD,
      useClass: isTestEnv ? NoopThrottlerGuard : ThrottlerGuard,
    },
  ],
})
export class AppModule {}
