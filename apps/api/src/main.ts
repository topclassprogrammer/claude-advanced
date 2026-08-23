import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const webOrigin = process.env.WEB_ORIGIN;
  if (!webOrigin && process.env.NODE_ENV === 'production') {
    throw new Error('WEB_ORIGIN must be set in production');
  }

  const app = await NestFactory.create(AppModule, new ExpressAdapter());
  app.use(helmet());
  app.enableCors({
    origin: webOrigin ?? 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
