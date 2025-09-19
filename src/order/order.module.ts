import { Module } from "@nestjs/common"

 @Module({
 imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Order, OrderItem],
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Order, OrderItem]),
    ClientsModule.register([
      { name: 'AUTH_SERVICE', transport: Transport.TCP, options: { host: 'auth-service', port: 3002 } },
      { name: 'PRODUCT_SERVICE', transport: Transport.TCP, options: { host: 'product-service', port: 3003 } },
      { name: 'INVENTORY_SERVICE', transport: Transport.TCP, options: { host: 'inventory-service', port: 3006 } },
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
  controllers: [OrderController, OrderEventsController],
  providers: [OrderService],
})
export class OrderModule {}