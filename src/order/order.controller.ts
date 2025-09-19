import { Controller, Logger, HttpException, HttpStatus , Inject} from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ClientProxy } from '@nestjs/microservices';
import { OrderService } from './order.service';

@Controller()
export class OrderController {
  private readonly logger = new Logger(OrderController.name);

  constructor(
    @InjectRepository(Order) private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem) private readonly orderItemRepository: Repository<OrderItem>,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    private readonly orderService: OrderService,
  ) {}

  @MessagePattern({ cmd: 'order.create' })
  async createOrder(data: { cartId: string; user: { userId: string; role: string }; shippingAddress: any; billingAddress: any }) {
    try {
      const { cartId, user, shippingAddress, billingAddress } = data;
      this.logger.log({ message: `Creating order for cart: ${cartId}`, userId: user.userId, role: user.role });

      // Validate user
      const userData = await firstValueFrom( await this.orderService.validateUser(user.userId));
      if (!userData) {
        throw new HttpException('Invalid user', HttpStatus.BAD_REQUEST);
      }

      // Fetch cart via TCP (from Cart Service)
      const cart = await firstValueFrom( await this.orderService.getCart(cartId, user)) as Order;
      if (!cart || cart.items.length === 0) {
        throw new HttpException('Cart is empty or not found', HttpStatus.BAD_REQUEST);
      }

      // Validate products and reserve inventory
      const orderItems: OrderItem[] = [];
      let totalAmount = 0;
      for (const item of cart.items) {
        const product = await firstValueFrom(this.productClient.send({ cmd: 'products.get' }, { id: item.productId, user }));
        if (!product || !product.isActive) {
          throw new HttpException(`Product not found: ${item.productId}`, HttpStatus.BAD_REQUEST);
        }
        const success = await firstValueFrom(this.inventoryClient.send({ cmd: 'inventory.reserve' }, { productId: item.productId, quantity: item.quantity, user }));
        if (!success) {
          throw new HttpException(`Insufficient stock for product: ${item.productId}`, HttpStatus.BAD_REQUEST);
        }

        const orderItem_new = await this.orderItemRepository.create({
            productId: item.productId,
            quantity: item.quantity,
            price: product.price,
            total: item.quantity * product.price,
          })

        orderItems.push(
          orderItem_new
        );
        totalAmount += item.quantity * product.price;
      }

      // Create order
      const order = this.orderRepository.create({
        userId: user.userId,
        status: OrderStatus.PENDING,
        totalAmount,
        shippingAddress,
        billingAddress,
        items: orderItems,
      });
      await this.orderRepository.save(order);

      // Emit OrderCreatedEvent
      await this.orderService.emitOrderCreatedEvent(order.id, user.userId, cartId);

      this.logger.log({ message: `Order created: ${order.id}`, userId: user.userId });
      return order;
    } catch (error) {
      this.logger.error({ message: `Failed to create order for cart: ${data.cartId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'order.get' })
  async getOrder(data: { id: string; user: { userId: string; role: string } }) {
    try {
      const { id, user } = data;
      this.logger.log({ message: `Fetching order: ${id}`, userId: user.userId, role: user.role });

      let query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .where('order.id = :id', { id });

      if (user.role === 'CLIENT') {
        query = query.andWhere('order.userId = :userId', { userId: user.userId });
      }

      const order = await query.getOne();
      if (!order) {
        throw new HttpException('Order not found or unauthorized', HttpStatus.NOT_FOUND);
      }
      return order;
    } catch (error) {
      this.logger.error({ message: `Failed to fetch order: ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'order.list' })
  async listOrders(data: { user: { userId: string; role: string } }) {
    try {
      const { user } = data;
      this.logger.log({ message: 'Listing orders', userId: user.userId, role: user.role });

      let query = this.orderRepository
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items');

      if (user.role === 'CLIENT') {
        query = query.where('order.userId = :userId', { userId: user.userId });
      }

      const orders = await query.getMany();
      return orders;
    } catch (error) {
      this.logger.error({ message: 'Failed to list orders', error: error.message, stack: error.stack });
      throw new HttpException('Failed to list orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'order.updateStatus' })
  async updateOrderStatus(data: { id: string; status: OrderStatus; user: { userId: string; role: string } }) {
    try {
      const { id, status, user } = data;
      this.logger.log({ message: `Updating order status: ${id} to ${status}`, userId: user.userId, role: user.role });

      if (user.role === 'CLIENT') {
        throw new HttpException('Unauthorized to update order status', HttpStatus.FORBIDDEN);
      }

      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order) {
        throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      }

      order.status = status;
      await this.orderRepository.save(order);
      this.logger.log({ message: `Order status updated: ${id} to ${status}`, userId: user.userId });
      return order;
    } catch (error) {
      this.logger.error({ message: `Failed to update order status: ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }
}