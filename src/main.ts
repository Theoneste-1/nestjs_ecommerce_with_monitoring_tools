import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
const app = await NestFactory.createMicroservice<MicroserviceOptions>(
  AppModule,
    // {
    //   transport: Transport.RMQ,
    //   options: {
    //     urls: [process.env.RABBITMQ_URL || 'amqp://rabbitmq:rabbitmq123@rabbitmq:5672'],
    //     queue: 'products_queue',
    //     queueOptions: {
    //       durable: true,
    //     },
    //   },
    // },
    {
      transport: Transport.TCP,
      options: {
        host: 'localhost',
        port: 3001,
      },
    }
  );
  await app.listen();
}
bootstrap();
