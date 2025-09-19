import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrderService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient: ClientProxy,
  ) {}

  async validateUser(userId: string) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'auth.validateUser' }, { userId }));
    } catch (error) {
      throw new Error('User validation failed');
    }
  }

  async getCart(cartId: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.cartClient.send({ cmd: 'cart.get' }, { user, sessionId: cartId }));
    } catch (error) {
      throw new Error('Cart fetch failed');
    }
  }

  async emitOrderCreatedEvent(orderId: string, userId: string, cartId: string) {
    this.rabbitmqClient.emit('order.created', {
      orderId,
      userId,
      cartId,
      timestamp: new Date().toISOString(),
    });
  }
}