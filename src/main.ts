import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT')!;
  const frontendUrl = configService.get<string>('FRONTEND_URL')!;

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  await app.listen(port);

  console.log(`Server running on port ${port}`);
}

void bootstrap();