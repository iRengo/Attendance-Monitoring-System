import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // Keep your global prefix
  app.setGlobalPrefix('api');

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

  // Debug: log registered express routes (helps confirm what routes are actually available)
  try {
    // @ts-ignore - runtime introspection of Express internals
    const router = app.getHttpAdapter().getInstance()._router;
    if (router && router.stack) {
      const routes = router.stack
        .filter((s) => s.route)
        .map((s) => {
          const methods = Object.keys(s.route.methods).join(',').toUpperCase();
          return `${methods} ${s.route.path}`;
        });
      Logger.log('Registered Express routes:');
      routes.forEach((r) => Logger.log('  ' + r));
    } else {
      Logger.log('No router.stack available for route introspection (non-express or unusual setup).');
    }
  } catch (err) {
    Logger.error('Failed to introspect routes', err as any);
  }
}

process.on('uncaughtException', (err) => console.error('uncaughtException', err));
process.on('unhandledRejection', (reason) => console.error('unhandledRejection', reason));

bootstrap();