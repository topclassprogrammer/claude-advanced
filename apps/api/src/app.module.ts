import {
  CanActivate,
  Injectable,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MeetingModule } from './meeting/meeting.module';
import { MeetingFileModule } from './meeting-file/meeting-file.module';
import { ProfileModule } from './profile/profile.module';

/**
 * Throttling включён только при NODE_ENV=production. И Jest e2e-тесты
 * apps/api (регистрируют нескольких пользователей с одного IP в beforeEach),
 * и Playwright e2e apps/web (fullyParallel — параллельные регистрации со
 * многих воркеров) в реалистичном сценарии за пару тестовых файлов ложатся
 * на лимит auth-роутов, если throttling активен в dev/test-режиме.
 */
@Injectable()
class NoopThrottlerGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

const throttlingEnabled = process.env.NODE_ENV === 'production';

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
      useClass: throttlingEnabled ? ThrottlerGuard : NoopThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Регистрируется здесь, а не только в main.ts — e2e-тесты создают
    // приложение через createNestApplication() напрямую, минуя bootstrap().
    consumer.apply(cookieParser()).forRoutes('*');
  }
}
