import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const PORT = process.env.PORT || '3001';
  const app = await NestFactory.create(AppModule);

  // Connect to microservices via TCP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0', // Listen on all interfaces
      port: 3001, // TCP port for microservices communication
    },
  });

  const config = new DocumentBuilder()
    .setTitle('E Commerce API')
    .setDescription('The ecommerce API description')
    .setVersion('1.0')
    .addTag('e-commerce')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  // Start all microservices
  await app.startAllMicroservices();
}
bootstrap();
