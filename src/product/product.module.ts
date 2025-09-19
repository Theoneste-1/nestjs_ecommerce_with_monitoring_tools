// services/product-service/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { HttpModule } from '@nestjs/axios';
import { CategoryModule } from 'src/category/category.module';
import { ProductService } from './product.service';
@Module({
  imports: [
  ],
  controllers:[],
  providers: [ProductService],
  exports:[ProductService]
})
export class ProductModule {}