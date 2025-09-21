import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtModule } from '@nestjs/jwt';
import { Counter, Histogram } from 'prom-client';

@Module({
  imports: [
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'auth_service_',
        },
      },
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV !== 'production',
      }),
      inject: [ConfigService],
    }),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthController],
  exports: [AuthService],
  providers: [
    AuthService,
    {
      provide: 'PROM_METRIC_AUTH_OPERATIONS_TOTAL',
      useFactory: () => {
        return new Counter({
          name: 'auth_operations_total',
          help: 'Total number of authentication operations',
          labelNames: ['operation', 'status'],
        });
      },
    },
    {
      provide: 'PROM_METRIC_AUTH_OPERATION_DURATION_SECONDS',
      useFactory: () => {
        return new Histogram({
          name: 'auth_operation_duration_seconds',
          help: 'Duration of authentication operations in seconds',
          labelNames: ['operation'],
          buckets: [0.1, 0.5, 1, 2, 5],
        });
      },
    },
  ],
})
export class AuthModule {}
