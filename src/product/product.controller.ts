import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AppService } from 'src/app.service';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Roles('GUEST', 'CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async getProducts(@Request() req: any) {
    return this.appService.handleGetProducts(req.user);
  }

  @Get(':id')
  @Roles('GUEST', 'CLIENT', 'SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async getProductById(@Param('id') id: string, @Request() req: any) {
    return this.appService.handleGetProductById(id, req.user);
  }

  @Post()
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async createProduct(
    @Body() body: { name: string; description: string; price: number; sku: string; categoryId: string },
    @Request() req: any,
  ) {
    return this.appService.handleCreateProduct(body, req.user);
  }

  @Put(':id')
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async updateProduct(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; price?: number; sku?: string; categoryId?: string },
    @Request() req: any,
  ) {
    return this.appService.handleUpdateProduct(id, body, req.user);
  }

  @Delete(':id')
  @Roles('SELLER', 'ADMIN', 'SYSTEM_ADMIN')
  @UseGuards(RolesGuard)
  async deleteProduct(@Param('id') id: string, @Request() req: any) {
    return this.appService.handleDeleteProduct(id, req.user);
  }
}