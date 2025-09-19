
// services/product-service/src/events/events.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsService } from './events.service';

@Module({
  imports: [ConfigModule],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}