import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const PORT = process.env.PORT || "3000";
const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: parseInt(PORT, 10) },
  });
  await app.listen();
}
bootstrap();
