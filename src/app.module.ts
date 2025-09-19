// services/auth-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { JwtModule } from '@nestjs/jwt';
import { readFileSync } from 'fs';
import { join } from 'path';

import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { EventsModule } from './events/events.module';
import { User } from './auth/entities/user.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [User, RefreshToken],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        privateKey: readFileSync(
          configService.get<string>('JWT_PRIVATE_KEY_PATH') ||
            join(process.cwd(), 'keys', 'jwt-private.pem'),
        ),
        publicKey: readFileSync(
          configService.get<string>('JWT_PUBLIC_KEY_PATH') ||
            join(process.cwd(), 'keys', 'jwt-public.pem'),
        ),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'auth_service_',
        },
      },
    }),
    AuthModule,
    HealthModule,
    EventsModule,
  ],
})
export class AppModule {}
