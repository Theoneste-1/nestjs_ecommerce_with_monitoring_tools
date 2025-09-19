import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { CartService } from './cart.service';


@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @Roles('CLIENT', 'GUEST')
  @UseGuards(RolesGuard)
  async getCart(@Request() req: any) {
    return this.cartService.handleGetCart(req.user, req.headers['x-session-id']);
  }

  @Post('items')
  @Roles('CLIENT', 'GUEST')
  @UseGuards(RolesGuard)
  async addCartItem(
    @Body() body: { productId: string; quantity: number },
    @Request() req: any,
  ) {
    return this.cartService.handleAddCartItem(body, req.user, req.headers['x-session-id']);
  }

  @Put('items/:productId')
  @Roles('CLIENT', 'GUEST')
  @UseGuards(RolesGuard)
  async updateCartItem(
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
    @Request() req: any,
  ) {
    return this.cartService.handleUpdateCartItem(productId, body, req.user, req.headers['x-session-id']);
  }

  @Delete('items/:productId')
  @Roles('CLIENT', 'GUEST')
  @UseGuards(RolesGuard)
  async removeCartItem(@Param('productId') productId: string, @Request() req: any) {
    return this.cartService.handleRemoveCartItem(productId, req.user, req.headers['x-session-id']);
  }

  @Delete()
  @Roles('CLIENT', 'GUEST')
  @UseGuards(RolesGuard)
  async clearCart(@Request() req: any) {
    return this.cartService.handleClearCart(req.user, req.headers['x-session-id']);
  }

  @Post('merge')
  @Roles('CLIENT')
  @UseGuards(RolesGuard)
  async mergeCart(@Body() body: { sessionId: string }, @Request() req: any) {
    return this.cartService.handleMergeCart(body.sessionId, req.user);
  }
}