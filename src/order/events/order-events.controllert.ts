import { Controller, Logger } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { OrderService } from './order.service';

@Controller()
export class OrderEventsController {
  private readonly logger = new Logger(OrderEventsController.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepository: Repository<OrderItem>,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    private readonly orderService: OrderService,
  ) {}

  @EventPattern('cart.abandoned')
  async handleCartAbandoned(data: { cartId: string; userId: string | null; sessionId: string; timestamp: string }) {
    try {
      this.logger.log({ message: `Handling CartAbandonedEvent for cart: ${data.cartId}`, userId: data.userId, sessionId: data.sessionId });

      if (!data.userId) {
        this.logger.warn({ message: `No userId for abandoned cart: ${data.cartId}, skipping order creation` });
        return;
      }

      const user = await firstValueFrom(this.orderService.validateUser(data.userId));
      if (!user) {
        this.logger.warn({ message: `Invalid user for cart: ${data.cartId}` });
        return;
      }

      const cart = await firstValueFrom(this.orderService.getCart(data.cartId, { userId: data.userId, role: 'CLIENT' }));
      if (!cart || !cart.items.length) {
        this.logger.warn({ message: `Empty or invalid cart: ${data.cartId}` });
        return;
      }

      // Create order from abandoned cart
      const orderItems = [];
      let totalAmount = 0;
      for (const item of cart.items) {
        const product = await firstValueFrom(this.productClient.send({ cmd: 'products.get' }, { id: item.productId, user: { userId: data.userId, role: 'CLIENT' } }));
        if (!product || !product.isActive) {
          this.logger.warn({ message: `Product not found or inactive: ${item.productId}` });
          continue;
        }
        const success = await firstValueFrom(this.inventoryClient.send({ cmd: 'inventory.reserve' }, { productId: item.productId, quantity: item.quantity, user: { userId: data.userId, role: 'CLIENT' } }));
        if (!success) {
          this.logger.warn({ message: `Insufficient stock for product: ${item.productId}` });
          continue;
        }
        orderItems.push(
          this.orderItemRepository.create({
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            total: item.quantity * product.price,
          }),
        );
        totalAmount += item.quantity * product.price;
      }

      if (!orderItems.length) {
        this.logger.warn({ message: `No valid items for order from cart: ${data.cartId}` });
        return;
      }

      const order = this.orderRepository.create({
        userId: data.userId,
        status: OrderStatus.PENDING,
        totalAmount,
        shippingAddress: {}, // Placeholder; fetch from user profile
        billingAddress: {}, // Placeholder; fetch from user profile
        items: orderItems,
      });
      await this.orderRepository.save(order);

      // Emit OrderCreatedEvent
      await this.orderService.emitOrderCreatedEvent(order.id, data.userId, data.cartId);

      this.logger.log({ message: `Order created from abandoned cart: ${order.id}` });
    } catch (error) {
      this.logger.error({ message: `Failed to handle CartAbandonedEvent for cart: ${data.cartId}`, error: error.message, stack: error.stack });
    }
  }

  @EventPattern('payment.confirmed')
  async handlePaymentConfirmed(data: { orderId: string; userId: string }) {
    try {
      this.logger.log({ message: `Handling PaymentConfirmedEvent for order: ${data.orderId}`, userId: data.userId });

      const order = await this.orderRepository.findOne({ where: { id: data.orderId, userId: data.userId } });
      if (!order) {
        this.logger.warn({ message: `Order not found: ${data.orderId}` });
        return;
      }

      order.status = OrderStatus.CONFIRMED;
      await this.orderRepository.save(order);
      this.logger.log({ message: `Order status updated to CONFIRMED: ${data.orderId}` });
    } catch (error) {
      this.logger.error({ message: `Failed to handle PaymentConfirmedEvent for order: ${data.orderId}`, error: error.message, stack: error.stack });
    }
  }
}