import { Controller, Get, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RolesGuard } from 'src/auth/roles.guard';
import { InventoryService } from './inventory.service';
import { Roles } from 'src/auth/roles.decorator';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get(':productId')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SELLER')
  @UseGuards(RolesGuard)
  async getInventory(@Param('productId') productId: string, @Request() req: any) {
    return this.inventoryService.handleGetInventory(productId, req.user);
  }

  @Put(':productId/reserve')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SELLER')
  @UseGuards(RolesGuard)
  async reserveStock(
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
    @Request() req: any,
  ) {
    return this.inventoryService.handleReserveStock(productId, body.quantity, req.user);
  }

  @Put(':productId/release')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SELLER')
  @UseGuards(RolesGuard)
  async releaseStock(
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
    @Request() req: any,
  ) {
    return this.inventoryService.handleReleaseStock(productId, body.quantity, req.user);
  }

  @Put(':productId/stock')
  @Roles('ADMIN', 'SYSTEM_ADMIN', 'SELLER')
  @UseGuards(RolesGuard)
  async updateStock(
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
    @Request() req: any,
  ) {
    return this.inventoryService.handleUpdateStock(productId, body.quantity, req.user);
  }
}