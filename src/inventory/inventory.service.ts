// src/inventory.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from './entities/inventory.entity';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @Inject('RABBITMQ_CLIENT') private rabbitmqClient: ClientProxy,
  ) {}

  async getInventory(productId: string): Promise<Inventory> {
    let inventory = await this.inventoryRepository.findOne({ where: { productId } });

    if (!inventory) {
      inventory = this.inventoryRepository.create({
        productId,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
      });
      await this.inventoryRepository.save(inventory);
    }

    return inventory;
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
    const inventory = await this.getInventory(productId);

    if (inventory.availableQuantity < quantity) {
      return false;
    }

    inventory.reservedQuantity += quantity;
    inventory.availableQuantity = inventory.quantity - inventory.reservedQuantity;
    await this.inventoryRepository.save(inventory);

    // Check for low stock
    if (inventory.availableQuantity <= inventory.lowStockThreshold) {
      this.rabbitmqClient.emit('low_stock_alert', {
        productId,
        currentStock: inventory.availableQuantity,
        threshold: inventory.lowStockThreshold,
      });
    }

    return true;
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    const inventory = await this.getInventory(productId);
    inventory.reservedQuantity = Math.max(0, inventory.reservedQuantity - quantity);
    inventory.availableQuantity = inventory.quantity - inventory.reservedQuantity;
    await this.inventoryRepository.save(inventory);
  }

  async updateStock(productId: string, newQuantity: number): Promise<void> {
    const inventory = await this.getInventory(productId);
    inventory.quantity = newQuantity;
    inventory.availableQuantity = inventory.quantity - inventory.reservedQuantity;
    await this.inventoryRepository.save(inventory);
  }
}