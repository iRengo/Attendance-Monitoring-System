import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Allow larger payloads (for Base64 images or binary uploads)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // ✅ Serve static assets (optional)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // ✅ Add the /api global prefix so routes become /api/...
  app.setGlobalPrefix('api');

  // ✅ Enable CORS for frontend (React Vite)
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost',
      'https://aics-attendanceportal.online',
      'https://www.aics-attendanceportal.online',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  Logger.log(`🚀 Backend running at http://localhost:${port} with global prefix /api`);
  Logger.log(`🚀 Health endpoint: http://localhost:${port}/api/password/status`);
}

// globally log unhandled errors for easier debugging in production
process.on('uncaughtException', (err) => console.error('uncaughtException', err));
process.on('unhandledRejection', (reason) => console.error('unhandledRejection', reason));

bootstrap();