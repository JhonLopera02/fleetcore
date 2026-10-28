import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Valida y transforma los DTO; rechaza campos que no estén declarados.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  // Swagger: http://localhost:<PORT>/docs
  const swagger = new DocumentBuilder()
    .setTitle('FleetCore API')
    .setDescription('Gestión del mantenimiento de la flota de vehículos')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = app.get(ConfigService).get('PORT', '3000');
  await app.listen(port);
  console.log(`FleetCore API: http://localhost:${port}  |  Swagger: http://localhost:${port}/docs`);
}
bootstrap();
