import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CartService {
  constructor(
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient: ClientProxy,
  ) {}

  async handleGetCart(user: { userId: string; role: string }, sessionId: string) {
    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.get' }, { user, sessionId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleAddCartItem(
    data: { productId: string; quantity: number },
    user: { userId: string; role: string },
    sessionId: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.items.add' }, { data, user, sessionId }),
      );
      // Emit CartAbandonedEvent if cart is updated (simplified logic; in practice, use a scheduler)
      if (result) {
        this.rabbitmqClient.emit('cart.abandoned', {
          cartId: result.id,
          userId: user.userId || null,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleUpdateCartItem(
    productId: string,
    data: { quantity: number },
    user: { userId: string; role: string },
    sessionId: string,
  ) {
    try {
      const result = await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.items.update' }, { productId, data, user, sessionId }),
      );
      // Emit CartAbandonedEvent on update
      if (result) {
        this.rabbitmqClient.emit('cart.abandoned', {
          cartId: result.id,
          userId: user.userId || null,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleRemoveCartItem(
    productId: string,
    user: { userId: string; role: string },
    sessionId: string,
  ) {
    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.items.remove' }, { productId, user, sessionId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleClearCart(user: { userId: string; role: string }, sessionId: string) {
    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.clear' }, { user, sessionId }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleMergeCart(sessionId: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(
        this.cartClient.send({ cmd: 'cart.merge' }, { sessionId, user }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Cart service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}