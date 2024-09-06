import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
