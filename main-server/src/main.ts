import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Use validation pipes golbally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PakSentiment Swagger Documentation')
    .setDescription('i dont know yet')
    .setTermsOfService('not yet identified')
    .setLicense('MIT License', 'https://en.wikipedia.org/wiki/MIT_License')
    .addServer('http://localhost:3000')
    .setVersion('1.0.0')
    .build();

  // Instaniate Document
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
