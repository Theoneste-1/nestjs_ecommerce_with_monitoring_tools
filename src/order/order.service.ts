import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientProxy,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient: ClientProxy,
  ) {}

  async handleCreateOrder(data: { cartId: string; shippingAddress: any; billingAddress: any }, user: { userId: string; role: string }) {
    try {
      const order = await firstValueFrom(
        this.orderClient.send({ cmd: 'order.create' }, { ...data, user }),
      );
      // Emit OrderCreatedEvent (redundant here as Order Service emits it, but included for completeness)
      this.rabbitmqClient.emit('order.created', {
        orderId: order.id,
        userId: user.userId,
        cartId: data.cartId,
        timestamp: new Date().toISOString(),
      });
      return order;
    } catch (error) {
      throw new HttpException(error.message || 'Order service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleListOrders(user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.orderClient.send({ cmd: 'order.list' }, { user }));
    } catch (error) {
      throw new HttpException(error.message || 'Order service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleGetOrder(id: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.orderClient.send({ cmd: 'order.get' }, { id, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Order service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleUpdateOrderStatus(id: string, status: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.orderClient.send({ cmd: 'order.updateStatus' }, { id, status, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Order service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}