import { Module } from '@nestjs/common';
import { Cart} from './entities/cart.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CartController } from './cart.service';
import { CartItem } from './entities/cart-item.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Cart, CartItem],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Cart, CartItem]),
    ClientsModule.register([
      { name: 'PRODUCT_SERVICE', transport: Transport.TCP, options: { host: 'product-service', port: 3003 } },
      { name: 'INVENTORY_SERVICE', transport: Transport.TCP, options: { host: 'inventory-service', port: 3006 } },
    ]),
  ],
  controllers: [CartController],
}
)
export class CartModule{}