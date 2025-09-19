import { Module } from '@nestjs/common';

import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Payment],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Payment]),
    ClientsModule.register([
      { name: 'ORDER_SERVICE', transport: Transport.TCP, options: { host: 'order-service', port: 3005 } },
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL],
          queue: 'ecommerce_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [PaymentController, PaymentEventsController],
  providers: [PaymentService],
})
export class PaymentModule {}