import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.TCP,
      options: {
        host: 'category-service', // Replace with actual host
        port: 3002, // Replace with actual port
      },
    });
  }

  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    try {
      const user = { userId, role: 'ADMIN' }; // Adjust role based on your auth strategy
      return await this.client
        .send({ cmd: 'categories.create' }, { data: createCategoryDto, user })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.client.send({ cmd: 'categories.list' }, {}).toPromise();
    } catch (error) {
      this.logger.error(`Failed to list categories: ${error.message}`);
      throw error;
    }
  }

  async findRootCategories() {
    try {
      return await this.client.send({ cmd: 'categories.roots' }, {}).toPromise();
    } catch (error) {
      this.logger.error(`Failed to list root categories: ${error.message}`);
      throw error;
    }
  }

  async getCategoryTree(parentId?: string) {
    try {
      return await this.client
        .send({ cmd: 'categories.tree' }, { parentId })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to get category tree: ${error.message}`);
      throw error;
    }
  }

  async findBySlug(slug: string) {
    try {
      return await this.client
        .send({ cmd: 'categories.getBySlug' }, { slug })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to get category by slug ${slug}: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      return await this.client
        .send({ cmd: 'categories.get' }, { id })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to get category ${id}: ${error.message}`);
      throw error;
    }
  }

  async findChildren(id: string) {
    try {
      return await this.client
        .send({ cmd: 'categories.children' }, { id })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to get category children ${id}: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string) {
    try {
      const user = { userId, role: 'ADMIN' }; // Adjust role based on your auth strategy
      return await this.client
        .send({ cmd: 'categories.update' }, { id, data: updateCategoryDto, user })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to update category ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string, userId: string) {
    try {
      const user = { userId, role: 'ADMIN' }; // Adjust role based on your auth strategy
      return await this.client
        .send({ cmd: 'categories.delete' }, { id, user })
        .toPromise();
    } catch (error) {
      this.logger.error(`Failed to delete category ${id}: ${error.message}`);
      throw error;
    }
  }
}