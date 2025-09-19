import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryService {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientProxy,
    @Inject('RABBITMQ_CLIENT') private readonly rabbitmqClient: ClientProxy,
  ) {}

  async handleGetInventory(productId: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(
        this.inventoryClient.send({ cmd: 'inventory.get' }, { productId, user }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Inventory service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleReserveStock(productId: string, quantity: number, user: { userId: string; role: string }) {
    try {
      const result = await firstValueFrom(
        this.inventoryClient.send({ cmd: 'inventory.reserve' }, { productId, quantity, user }),
      );
      if (!result) {
        throw new HttpException('Insufficient stock', HttpStatus.BAD_REQUEST);
      }
      // Emit LowStockAlertEvent if triggered by Inventory Service
      return result;
    } catch (error) {
      throw new HttpException(error.message || 'Inventory service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleReleaseStock(productId: string, quantity: number, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(
        this.inventoryClient.send({ cmd: 'inventory.release' }, { productId, quantity, user }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Inventory service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleUpdateStock(productId: string, quantity: number, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(
        this.inventoryClient.send({ cmd: 'inventory.update' }, { productId, quantity, user }),
      );
    } catch (error) {
      throw new HttpException(error.message || 'Inventory service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}