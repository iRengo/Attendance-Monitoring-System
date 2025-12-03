import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ Allow larger payloads (for Base64 images or binary uploads)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  // ✅ Serve static assets (optional)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // ✅ Enable CORS for frontend (React Vite)
  app.enableCors({
    origin: [
      "http://localhost:5173",
      "http://localhost",
      "https://aics-attendanceportal.online",
      "https://www.aics-attendanceportal.online",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  // ✅ Add global prefix /api
  app.setGlobalPrefix('api');

  await app.listen(3000);
  console.log('🚀 Backend running at http://localhost:3000');
  console.log('🌐 All routes are now prefixed with /api');
}

bootstrap();
