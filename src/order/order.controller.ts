import { Controller, Get, Post, Put, Param, Body, UseGuards, Request } from '@nestjs/common';
import { RolesGuard } from 'src/auth/roles.guard';
import { OrderService } from './order.service';
import { Roles } from 'src/auth/roles.decorator';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles('CLIENT')
  @UseGuards(RolesGuard)
  async createOrder(
    @Body() body: { cartId: string; shippingAddress: any; billingAddress: any },
    @Request() req: any,
  ) {
    return this.orderService.handleCreateOrder(body, req.user);
  }

  @Get()
  @Roles('CLIENT', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async listOrders(@Request() req: any) {
    return this.orderService.handleListOrders(req.user);
  }

  @Get(':id')
  @Roles('CLIENT', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async getOrder(@Param('id') id: string, @Request() req: any) {
    return this.orderService.handleGetOrder(id, req.user);
  }

  @Put(':id/status')
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async updateOrderStatus(@Param('id') id: string, @Body() body: { status: string }, @Request() req: any) {
    return this.orderService.handleUpdateOrderStatus(id, body.status, req.user);
  }
}