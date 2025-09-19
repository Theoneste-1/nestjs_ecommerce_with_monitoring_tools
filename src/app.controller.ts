import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Request, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Auth Routes
  @Post('auth/register')
  async register(@Body() body: { email: string; password: string; role: string }) {
    return this.appService.handleAuthRegister(body);
  }

  @Post('auth/login')
  async login(@Body() body: { email: string; password: string }) {
    return this.appService.handleAuthLogin(body);
  }

  // Product Routes
  @Get('products')
  @Roles('GUEST', 'CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async getProducts(@Request() req: any) {
    return this.appService.handleGetProducts(req.user);
  }

  @Get('products/:id')
  @Roles('GUEST', 'CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async getProductById(@Param('id') id: string, @Request() req: any) {
    return this.appService.handleGetProductById(id, req.user);
  }

  @Post('products')
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async createProduct(@Body() body: { name: string; description: string; price: number; sku: string; categoryId: string }, @Request() req: any) {
    return this.appService.handleCreateProduct(body, req.user);
  }

  @Put('products/:id')
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async updateProduct(@Param('id') id: string, @Body() body: { name?: string; description?: string; price?: number; sku?: string; categoryId?: string }, @Request() req: any) {
    return this.appService.handleUpdateProduct(id, body, req.user);
  }

  @Delete('products/:id')
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async deleteProduct(@Param('id') id: string, @Request() req: any) {
    return this.appService.handleDeleteProduct(id, req.user);
  }
}
