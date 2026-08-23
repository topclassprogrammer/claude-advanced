import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './auth-token.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterHandler } from './commands/handlers/register.handler';
import { LoginHandler } from './queries/handlers/login.handler';
import { UsersModule } from '../users/users.module';

const CommandHandlers = [RegisterHandler];
const QueryHandlers = [LoginHandler];

@Module({
  imports: [
    CqrsModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret || secret.length < 32) {
          throw new Error(
            'JWT_SECRET must be set and at least 32 characters long',
          );
        }

        return {
          secret,
          signOptions: {
            algorithm: 'HS256',
            expiresIn: configService.get<string>(
              'JWT_EXPIRES_IN',
              '1h',
            ) as unknown as number,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthTokenService,
    JwtAuthGuard,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
