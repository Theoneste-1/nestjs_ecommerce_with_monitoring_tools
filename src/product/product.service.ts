// services/product-service/src/product/product.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, In } from 'typeorm';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { Histogram } from 'perf_hooks';
import { MessagePattern } from '@nestjs/microservices';

export interface ProductQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  categoryId?: string;
  sellerId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}

export interface PaginatedProductResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    private readonly eventsService: any
  ) {}

  async create(
    createProductDto: CreateProductDto,
    sellerId: string,
  ): Promise<Product> {
    try {
      // Check if SKU already exists
      const existingProduct = await this.productRepository.findOne({
        where: { sku: createProductDto.sku },
      });

      if (existingProduct) {
        throw new ConflictException(`Product with SKU ${createProductDto.sku} already exists`);
      }

      // Verify category exists
      const category = await this.categoryRepository.findOne({
        where: { id: createProductDto.categoryId, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Create product
      const product = this.productRepository.create({
        ...createProductDto,
        sellerId,
      });

      const savedProduct = await this.productRepository.save(product);

      // Emit event
      await this.eventsService.emitProductCreated({
        productId: savedProduct.id,
        sellerId,
        categoryId: savedProduct.categoryId,
        name: savedProduct.name,
        price: savedProduct.price,
        sku: savedProduct.sku,
      });

      this.logger.log(`Product created successfully: ${savedProduct.name}`, {
        productId: savedProduct.id,
        sellerId,
        categoryId: savedProduct.categoryId,
        sku: savedProduct.sku,
      });

      return savedProduct;
    } catch (error) {
     this.logger.error(`Product creation failed:`, error.message, {
        sellerId,
        sku: createProductDto.sku,
        error: error.message,
      });
      throw error;
    } finally {
  
    }
  }


  
  @MessagePattern({ cmd: 'products.list' })
  async listProducts(data: { user: { userId: string; role: string } }) {
    try {
      const { user } = data;
      this.logger.log({ message: 'Listing products', userId: user.userId, role: user.role });

      let query = this.productRepository.createQueryBuilder('product').where('product.isActive = :isActive', { isActive: true });

      if (user.role === 'SELLER') {
        query = query.andWhere('product.sellerId = :sellerId', { sellerId: user.userId });
      }

      const products = await query.getMany();
      return products;
    } catch (error) {
      this.logger.error({ message: 'Failed to list products', error: error.message, stack: error.stack });
      throw new HttpException('Failed to list products', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'products.get' })
  async getProductById(data: { id: string; user: { userId: string; role: string } }) {
    try {
      const { id, user } = data;
      this.logger.log({ message: `Fetching product ${id}`, userId: user.userId, role: user.role });

      let query = this.productRepository
        .createQueryBuilder('product')
        .where('product.id = :id', { id })
        .andWhere('product.isActive = :isActive', { isActive: true });

      if (user.role === 'SELLER') {
        query = query.andWhere('product.sellerId = :sellerId', { sellerId: user.userId });
      }

      const product = await query.getOne();
      if (!product) {
        throw new HttpException('Product not found', HttpStatus.NOT_FOUND);
      }
      return product;
    } catch (error) {
      this.logger.error({ message: `Failed to fetch product ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'products.create' })
  async createProduct(data: { data: { sellerId: string; name: string; description: string; price: number; sku: string; categoryId: string }; user: { userId: string; role: string } }) {
    try {
      const { data: productData, user } = data;
      this.logger.log({ message: 'Creating product', userId: user.userId, role: user.role });

      if (user.role === 'SELLER' && user.userId) {
        productData['sellerId'] = user.userId;
      }

      const product = this.productRepository.create({
        ...productData,
        isActive: true,
        sellerId: user.role === 'SELLER' ? user.userId : productData.sellerId,
      });

      const savedProduct = await this.productRepository.save(product);
      this.logger.log({ message: `Product created: ${savedProduct.id}`, userId: user.userId });
      return savedProduct;
    } catch (error) {
      this.logger.error({ message: 'Failed to create product', error: error.message, stack: error.stack });
      throw new HttpException('Failed to create product', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'products.update' })
  async updateProduct(data: { id: string; data: { name?: string; description?: string; price?: number; sku?: string; categoryId?: string }; user: { userId: string; role: string } }) {
    try {
      const { id, data: updateData, user } = data;
      this.logger.log({ message: `Updating product ${id}`, userId: user.userId, role: user.role });

      let query = this.productRepository
        .createQueryBuilder('product')
        .where('product.id = :id', { id })
        .andWhere('product.isActive = :isActive', { isActive: true });

      if (user.role === 'SELLER') {
        query = query.andWhere('product.sellerId = :sellerId', { sellerId: user.userId });
      }

      const product = await query.getOne();
      if (!product) {
        throw new HttpException('Product not found or unauthorized', HttpStatus.NOT_FOUND);
      }

      await this.productRepository.update(id, updateData);
      const updatedProduct = await this.productRepository.findOneBy({ id });
      this.logger.log({ message: `Product updated: ${id}`, userId: user.userId });
      return updatedProduct;
    } catch (error) {
      this.logger.error({ message: `Failed to update product ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'products.delete' })
  async deleteProduct(data: { id: string; user: { userId: string; role: string } }) {
    try {
      const { id, user } = data;
      this.logger.log({ message: `Deleting product ${id}`, userId: user.userId, role: user.role });

      let query = this.productRepository
        .createQueryBuilder('product')
        .where('product.id = :id', { id })
        .andWhere('product.isActive = :isActive', { isActive: true });

      if (user.role === 'SELLER') {
        query = query.andWhere('product.sellerId = :sellerId', { sellerId: user.userId });
      }

      const product = await query.getOne();
      if (!product) {
        throw new HttpException('Product not found or unauthorized', HttpStatus.NOT_FOUND);
      }

      await this.productRepository.update(id, { isActive: false });
      this.logger.log({ message: `Product deleted: ${id}`, userId: user.userId });
      return { message: `Product ${id} deleted successfully` };
    } catch (error) {
      this.logger.error({ message: `Failed to delete product ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }
}