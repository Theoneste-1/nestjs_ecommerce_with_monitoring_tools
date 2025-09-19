import { Controller, Logger, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart} from './entities/cart.entity';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CartItem } from './entities/cart-item.entity';

@Controller()
export class CartController {
  private readonly logger = new Logger(CartController.name);

  constructor(
    @InjectRepository(Cart)
    private readonly cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepository: Repository<CartItem>,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
  ) {}

  @MessagePattern({ cmd: 'cart.get' })
  async getCart(data: { user: { userId: string; role: string }; sessionId: string }) {
    try {
      const { user, sessionId } = data;
      this.logger.log({ message: 'Fetching cart', userId: user.userId, role: user.role, sessionId });

      const cart = await this.findOrCreateCart(user, sessionId);
      return cart;
    } catch (error) {
      this.logger.error({ message: 'Failed to fetch cart', error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cart.items.add' })
  async addCartItem(data: { data: { productId: string; quantity: number }; user: { userId: string; role: string }; sessionId: string }) {
    try {
      const { data: { productId, quantity }, user, sessionId } = data;
      this.logger.log({ message: `Adding item to cart: ${productId}`, userId: user.userId, role: user.role, sessionId });

      // Validate product and inventory
      const product = await firstValueFrom(this.productClient.send({ cmd: 'products.get' }, { id: productId, user }));
      if (!product || !product.isActive) {
        throw new HttpException('Product not found or inactive', HttpStatus.NOT_FOUND);
      }
      const inventory = await firstValueFrom(this.inventoryClient.send({ cmd: 'inventory.get' }, { productId }));
      if (inventory.quantity < quantity) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }

      const cart = await this.findOrCreateCart(user, sessionId);
      let cartItem = cart.items.find((item) => item.productId === productId);

      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.totalPrice = cartItem.quantity * product.price;
        await this.cartItemRepository.save(cartItem);
      } else {
        cartItem = this.cartItemRepository.create({
          productId,
          quantity,
          unitPrice: product.price,
          totalPrice: quantity * product.price,
          cart,
        });
        cart.items.push(cartItem);
        await this.cartItemRepository.save(cartItem);
      }

      cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      await this.cartRepository.save(cart);
      return cart;
    } catch (error) {
      this.logger.error({ message: `Failed to add item to cart: ${data.data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cart.items.update' })
  async updateCartItem(data: { productId: string; data: { quantity: number }; user: { userId: string; role: string }; sessionId: string }) {
    try {
      const { productId, data: { quantity }, user, sessionId } = data;
      this.logger.log({ message: `Updating cart item: ${productId}`, userId: user.userId, role: user.role, sessionId });

      const cart = await this.findOrCreateCart(user, sessionId);
      const cartItem = cart.items.find((item) => item.productId === productId);
      if (!cartItem) {
        throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
      }

      // Validate inventory
      const inventory = await firstValueFrom(this.inventoryClient.send({ cmd: 'inventory.get' }, { productId }));
      if (inventory.quantity < quantity) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }

      cartItem.quantity = quantity;
      const product = await firstValueFrom(this.productClient.send({ cmd: 'products.get' }, { id: productId, user }));
      cartItem.totalPrice = quantity * product.price;
      await this.cartItemRepository.save(cartItem);

      cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      await this.cartRepository.save(cart);
      return cart;
    } catch (error) {
      this.logger.error({ message: `Failed to update cart item: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cart.items.remove' })
  async removeCartItem(data: { productId: string; user: { userId: string; role: string }; sessionId: string }) {
    try {
      const { productId, user, sessionId } = data;
      this.logger.log({ message: `Removing cart item: ${productId}`, userId: user.userId, role: user.role, sessionId });

      const cart = await this.findOrCreateCart(user, sessionId);
      const cartItem = cart.items.find((item) => item.productId === productId);
      if (!cartItem) {
        throw new HttpException('Item not found in cart', HttpStatus.NOT_FOUND);
      }

      await this.cartItemRepository.remove(cartItem);
      cart.items = cart.items.filter((item) => item.productId !== productId);
      cart.total = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      await this.cartRepository.save(cart);
      return cart;
    } catch (error) {
      this.logger.error({ message: `Failed to remove cart item: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cart.clear' })
  async clearCart(data: { user: { userId: string; role: string }; sessionId: string }) {
    try {
      const { user, sessionId } = data;
      this.logger.log({ message: 'Clearing cart', userId: user.userId, role: user.role, sessionId });

      const cart = await this.findOrCreateCart(user, sessionId);
      await this.cartItemRepository.delete({ cart: { id: cart.id } });
      cart.items = [];
      cart.total = 0;
      await this.cartRepository.save(cart);
      return cart;
    } catch (error) {
      this.logger.error({ message: 'Failed to clear cart', error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'cart.merge' })
  async mergeCart(data: { sessionId: string; user: { userId: string; role: string } }) {
    try {
      const { sessionId, user } = data;
      this.logger.log({ message: `Merging cart for session: ${sessionId}`, userId: user.userId, role: user.role });

      const guestCart = await this.cartRepository.findOne({
        where: { id: sessionId, userId: undefined },
        relations: ['items'],
      });
      if (!guestCart) {
        return await this.findOrCreateCart(user, sessionId);
      }

      const userCart = await this.findOrCreateCart(user, sessionId);
      for (const guestItem of guestCart.items) {
        const existingItem = userCart.items.find((item) => item.productId === guestItem.productId);
        if (existingItem) {
          existingItem.quantity += guestItem.quantity;
          existingItem.totalPrice = existingItem.quantity * guestItem.unitPrice;
          await this.cartItemRepository.save(existingItem);
        } else {
          const newItem = this.cartItemRepository.create({
            ...guestItem,
            cart: userCart,
          });
          userCart.items.push(newItem);
          await this.cartItemRepository.save(newItem);
        }
      }

      userCart.total = userCart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      await this.cartRepository.save(userCart);
      await this.cartRepository.delete({ id: sessionId });
      return userCart;
    } catch (error) {
      this.logger.error({ message: `Failed to merge cart: ${data.sessionId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  private async findOrCreateCart(user: { userId: string; role: string }, sessionId: string) {
    const identifier = user.userId || sessionId;
    let cart = await this.cartRepository.findOne({
      where: { id: identifier, isActive: true },
      relations: ['items'],
    });

    if (!cart) {
      cart = this.cartRepository.create({
        id: identifier,
        userId: user.userId,
        isActive: true,
        total: 0,
        items: [],
      });
      await this.cartRepository.save(cart);
    }
    return cart;
  }
}