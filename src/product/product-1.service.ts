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
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
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
  ) {}

  @MessagePattern({ cmd: 'products.create' })
  async createProduct(data: { data: CreateProductDto; user: { userId: string; role: string } }) {
    try {
      const { data: createProductDto, user } = data;
      this.logger.log({ message: 'Creating product', userId: user.userId, role: user.role });

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
        sellerId: user.role === 'SELLER' ? user.userId : createProductDto.sellerId,
        isActive: true,
      });

      const savedProduct = await this.productRepository.save(product);
      this.logger.log(`Product created successfully: ${savedProduct.name}`, {
        productId: savedProduct.id,
        sellerId: product.sellerId,
        categoryId: savedProduct.categoryId,
        sku: savedProduct.sku,
      });

      return savedProduct;
    } catch (error) {
      this.logger.error(`Product creation failed: ${error.message}`, {
        // sellerId: user.userId,
        // sku: createProductDto.sku,
        error: error.message,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'products.list' })
  async listProducts(data: { user: { userId: string; role: string }; filter?: ProductFilterDto }) {
    try {
      const { user, filter } = data;
      this.logger.log({ message: 'Listing products', userId: user.userId, role: user.role });

      let query = this.productRepository
        .createQueryBuilder('product')
        .where('product.isActive = :isActive', { isActive: true });

      if (user.role === 'SELLER') {
        query = query.andWhere('product.sellerId = :sellerId', { sellerId: user.userId });
      }

      if (filter) {
        if (filter.search) {
          query = query.andWhere('product.name ILIKE :search OR product.description ILIKE :search', { search: `%${filter.search}%` });
        }
        if (filter.categoryId) {
          query = query.andWhere('product.categoryId = :categoryId', { categoryId: filter.categoryId });
        }
        if (filter.minPrice) {
          query = query.andWhere('product.price >= :minPrice', { minPrice: filter.minPrice });
        }
        if (filter.maxPrice) {
          query = query.andWhere('product.price <= :maxPrice', { maxPrice: filter.maxPrice });
        }
        if (filter.sortBy) {
          query = query.orderBy(`product.${filter.sortBy}`, filter.sortOrder || 'ASC');
        }
        if (filter.page && filter.limit) {
          query = query.skip((filter.page - 1) * filter.limit).take(filter.limit);
        }
      }

      const [products, total] = await query.getManyAndCount();
      
      return {
        products,
        total,
        page: filter?.page || 1,
        limit: filter?.limit || 10,
        totalPages: Math.ceil(total / (filter?.limit || 10)),
      };
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
        throw new NotFoundException('Product not found or unauthorized');
      }
      return product;
    } catch (error) {
      this.logger.error({ message: `Failed to fetch product ${data.id}`, error: error.message, stack: error.stack });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'products.update' })
  async updateProduct(data: { id: string; data: UpdateProductDto; user: { userId: string; role: string } }) {
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
        throw new NotFoundException('Product not found or unauthorized');
      }

      // Validate category if provided
      if (updateData.categoryId) {
        const category = await this.categoryRepository.findOne({
          where: { id: updateData.categoryId, isActive: true },
        });
        if (!category) {
          throw new NotFoundException('Category not found');
        }
      }

      // Check SKU uniqueness if provided
      if (updateData.sku && updateData.sku !== product.sku) {
        const existingProduct = await this.productRepository.findOne({
          where: { sku: updateData.sku },
        });
        if (existingProduct) {
          throw new ConflictException(`Product with SKU ${updateData.sku} already exists`);
        }
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
        throw new NotFoundException('Product not found or unauthorized');
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