import { Module } from '@nestjs/common';

import { Payment } from './entities/payment.entity';
import { PaymentController } from './payment.controller';
import {TypeOrmModule} from '@nestjs/typeorm';
import {ClientsModule, Transport} from '@nestjs/microservices';
import { PaymentEventsController } from './payment.event.controller';
import { PaymentService } from './payment.service';


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
    
    ]),
  ],
  controllers: [PaymentController, PaymentEventsController],
  providers: [PaymentService],
})
export class PaymentModule {}