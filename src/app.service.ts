
// app.service.ts
import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    @Inject('AUTH_SERVICE') private readonly authClient: ClientProxy,
    @Inject('PRODUCT_SERVICE') private readonly productClient: ClientProxy,
  ) {}

  async handleAuthRegister(data: { email: string; password: string; role: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'auth.register' }, data));
    } catch (error) {
      throw new HttpException(error.message || 'Auth service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleAuthLogin(data: { email: string; password: string }) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'auth.login' }, data));
    } catch (error) {
      throw new HttpException(error.message || 'Auth service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async validateToken(token: string) {
    try {
      return await firstValueFrom(this.authClient.send({ cmd: 'auth.validate' }, { token }));
    } catch (error) {
      throw new HttpException('Invalid token', HttpStatus.UNAUTHORIZED);
    }
  }

  async handleGetProducts(user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.productClient.send({ cmd: 'products.list' }, { user }));
    } catch (error) {
      throw new HttpException(error.message || 'Product service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleGetProductById(id: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.productClient.send({ cmd: 'products.get' }, { id, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Product service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleCreateProduct(data: { name: string; description: string; price: number; sku: string; categoryId: string }, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.productClient.send({ cmd: 'products.create' }, { data, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Product service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleUpdateProduct(id: string, data: { name?: string; description?: string; price?: number; sku?: string; categoryId?: string }, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.productClient.send({ cmd: 'products.update' }, { id, data, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Product service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleDeleteProduct(id: string, user: { userId: string; role: string }) {
    try {
      return await firstValueFrom(this.productClient.send({ cmd: 'products.delete' }, { id, user }));
    } catch (error) {
      throw new HttpException(error.message || 'Product service error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}