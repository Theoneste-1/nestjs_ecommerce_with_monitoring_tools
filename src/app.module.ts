import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RateLimiterModule } from 'nestjs-rate-limiter';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OpenTelemetryModule } from 'nestjs-otel';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { ProductController } from './product/product-1.controller';
import { CategoryController } from './product/category.controller';
import { CategoryService } from './product/category.service';
import { ProductService } from './product/product.service';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        publicKey: configService.get<string>('JWT_PUBLIC_KEY_PATH'),
        signOptions: { algorithm: 'RS256' },
      }),
      inject: [ConfigService],
    }),
    RateLimiterModule,
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    OpenTelemetryModule.forRoot({
      metrics: {
        hostMetrics: true,
        apiMetrics: { enable: true },
      },
    }),
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: { host: 'auth-service', port: 3002 },
      },
      {
        name: 'PRODUCT_SERVICE',
        transport: Transport.TCP,
        options: { host: 'product-service', port: 3003 },
      },
      {
        name: 'CART_SERVICE',
        transport: Transport.TCP,
        options: { host: 'cart-service', port: 3004 },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.TCP,
        options: { host: 'order-service', port: 3005 },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.TCP,
        options: { host: 'inventory-service', port: 3006 },
      },
      {
        name: 'PAYMENT_SERVICE',
        transport: Transport.TCP,
        options: { host: 'payment-service', port: 3007 },
      },
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.TCP,
        options: { host: 'notification-service', port: 3008 },
      },
      {
    name: 'RABBITMQ_CLIENT',
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'main_queue',
      queueOptions: { durable: true },
    }
  },
    ]),
    HttpModule,
  ],
  controllers: [AppController, ProductController, CategoryController],
  providers: [
    AppService,
    CategoryService,
    ProductService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
