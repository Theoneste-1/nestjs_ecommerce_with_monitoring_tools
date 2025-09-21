import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'product-service', // Replace with actual host
        port: 3001, // Replace with actual port
      },
    });
  }

  async createProduct(createProductDto: CreateProductDto, sellerId: string) {
    try {
      const user = { userId: sellerId, role: 'SELLER' };
      return await this.client.send({ cmd: 'products.create' }, { data: createProductDto, user }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to create product: ${error.message}`);
      throw error;
    }
  }

  async listProducts(filter: ProductFilterDto) {
    try {
      const user = { userId: filter.sellerId || '', role: filter.sellerId ? 'SELLER' : 'ADMIN' };
      return await this.client.send({ cmd: 'products.list' }, { user }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to list products: ${error.message}`);
      throw error;
    }
  }

  async getProductById(id: string) {
    try {
      const user = { userId: '', role: 'ADMIN' }; // Adjust based on your auth strategy
      return await this.client.send({ cmd: 'products.get' }, { id, user }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to get product ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    try {
      const user = { userId: updateProductDto.sellerId || '', role: 'SELLER' };
      return await this.client.send({ cmd: 'products.update' }, { id, data: updateProductDto, user }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to update product ${id}: ${error.message}`);
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      const user = { userId: '', role: 'ADMIN' }; // Adjust based on your auth strategy
      return await this.client.send({ cmd: 'products.delete' }, { id, user }).toPromise();
    } catch (error) {
      this.logger.error(`Failed to delete product ${id}: ${error.message}`);
      throw error;
    }
  }
}