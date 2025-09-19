import { Controller, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  private readonly logger = new Logger(InventoryController.name);

  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern({ cmd: 'inventory.get' })
  async getInventory(data: { productId: string; user: { userId: string; role: string } }) {
    try {
      const { productId, user } = data;
      this.logger.log({ message: `Fetching inventory for product: ${productId}`, userId: user.userId, role: user.role });

      // RBAC: SELLER can only access their own products' inventory
      if (user.role === 'SELLER') {
        const product = await this.validateSellerProduct(productId, user.userId);
        if (!product) {
          throw new HttpException('Unauthorized access to product inventory', HttpStatus.FORBIDDEN);
        }
      }

      const inventory = await this.inventoryService.getInventory(productId);
      return inventory;
    } catch (error) {
      this.logger.error({ message: `Failed to fetch inventory for product: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'inventory.reserve' })
  async reserveStock(data: { productId: string; quantity: number; user: { userId: string; role: string } }) {
    try {
      const { productId, quantity, user } = data;
      this.logger.log({ message: `Reserving stock for product: ${productId}, quantity: ${quantity}`, userId: user.userId, role: user.role });

      // RBAC: SELLER can only reserve stock for their own products
      if (user.role === 'SELLER') {
        const product = await this.validateSellerProduct(productId, user.userId);
        if (!product) {
          throw new HttpException('Unauthorized access to product inventory', HttpStatus.FORBIDDEN);
        }
      }

      const success = await this.inventoryService.reserveStock(productId, quantity);
      if (!success) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }
      return success;
    } catch (error) {
      this.logger.error({ message: `Failed to reserve stock for product: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'inventory.release' })
  async releaseStock(data: { productId: string; quantity: number; user: { userId: string; role: string } }) {
    try {
      const { productId, quantity, user } = data;
      this.logger.log({ message: `Releasing stock for product: ${productId}, quantity: ${quantity}`, userId: user.userId, role: user.role });

      // RBAC: SELLER can only release stock for their own products
      if (user.role === 'SELLER') {
        const product = await this.validateSellerProduct(productId, user.userId);
        if (!product) {
          throw new HttpException('Unauthorized access to product inventory', HttpStatus.FORBIDDEN);
        }
      }

      await this.inventoryService.releaseStock(productId, quantity);
      return { message: `Stock released for product: ${productId}` };
    } catch (error) {
      this.logger.error({ message: `Failed to release stock for product: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'inventory.update' })
  async updateStock(data: { productId: string; quantity: number; user: { userId: string; role: string } }) {
    try {
      const { productId, quantity, user } = data;
      this.logger.log({ message: `Updating stock for product: ${productId}, new quantity: ${quantity}`, userId: user.userId, role: user.role });

      // RBAC: SELLER can only update stock for their own products
      if (user.role === 'SELLER') {
        const product = await this.validateSellerProduct(productId, user.userId);
        if (!product) {
          throw new HttpException('Unauthorized access to product inventory', HttpStatus.FORBIDDEN);
        }
      }

      await this.inventoryService.updateStock(productId, quantity);
      return { message: `Stock updated for product: ${productId}` };
    } catch (error) {
      this.logger.error({ message: `Failed to update stock for product: ${data.productId}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  private async validateSellerProduct(productId: string, sellerId: string) {
    // Note: This assumes a TCP call to Product Service to validate the product belongs to the seller
    // In a real implementation, inject ProductService or ClientProxy and call it
    // Placeholder for illustration
    return true; // Replace with actual Product Service TCP call
  }
}