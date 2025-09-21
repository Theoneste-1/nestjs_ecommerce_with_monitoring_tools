import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, In, Not } from 'typeorm';
import { MessagePattern } from '@nestjs/microservices';
import { CreateCategoryDto } from './dto/create-category.dto';
import { InjectRepository as InjectProductRepository } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { Category } from 'src/product/entities/category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: TreeRepository<Category>,
    @InjectProductRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  @MessagePattern({ cmd: 'categories.create' })
  async create(data: { data: CreateCategoryDto; user: { userId: string; role: string } }) {
    const { data: createCategoryDto, user } = data;
    const startTime = Date.now();

    try {
      // Check for existing name or slug
      const existingCategory = await this.categoryRepository.findOne({
        where: [{ name: createCategoryDto.name }, { slug: createCategoryDto.slug }],
      });

      if (existingCategory) {
        throw new ConflictException(
          `Category with name '${createCategoryDto.name}' or slug '${createCategoryDto.slug}' already exists`,
        );
      }

      // Validate parent category if provided
      let parentCategory: Category | null = null;
      if (createCategoryDto.parentId) {
        parentCategory = await this.categoryRepository.findOne({
          where: { id: createCategoryDto.parentId, isActive: true },
        });
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        // parent: parentCategory,
        // createdBy: user.userId,
        // isActive: true,
      }) as Category;

      const savedCategory = await this.categoryRepository.save(category);

      this.logger.log(`Category created successfully in ${Date.now() - startTime}ms`, {
        categoryId: savedCategory.id,
        createdBy: user.userId,
        name: savedCategory.name,
        responseTime: Date.now() - startTime,
      });

      return savedCategory;
    } catch (error) {
      this.logger.error(`Category creation failed in ${Date.now() - startTime}ms`, {
        createdBy: user.userId,
        name: createCategoryDto.name,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.list' })
  async findAll() {
    const startTime = Date.now();

    try {
      const categories = await this.categoryRepository.findTrees();

      this.logger.log(`Categories fetch completed in ${Date.now() - startTime}ms`, {
        totalCategories: categories.length,
        responseTime: Date.now() - startTime,
      });

      return categories;
    } catch (error) {
      this.logger.error(`Categories fetch failed in ${Date.now() - startTime}ms`, {
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw new HttpException('Failed to fetch categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'categories.roots' })
  async findRootCategories() {
    const startTime = Date.now();

    try {
      const categories = await this.categoryRepository.findRoots();

      this.logger.log(`Root categories fetch completed in ${Date.now() - startTime}ms`, {
        totalRootCategories: categories.length,
        responseTime: Date.now() - startTime,
      });

      return categories;
    } catch (error) {
      this.logger.error(`Root categories fetch failed in ${Date.now() - startTime}ms`, {
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw new HttpException('Failed to fetch root categories', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @MessagePattern({ cmd: 'categories.tree' })
  async getCategoryTree(data: { parentId?: string }) {
    const { parentId } = data;
    const startTime = Date.now();

    try {
      if (parentId) {
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: parentId, isActive: true },
        });
        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
        const tree = await this.categoryRepository.findDescendantsTree(parentCategory);
        this.logger.log(`Category tree fetch completed in ${Date.now() - startTime}ms`, {
          parentId,
          responseTime: Date.now() - startTime,
        });
        return tree;
      }

      const trees = await this.categoryRepository.findTrees();
      this.logger.log(`Category tree fetch completed in ${Date.now() - startTime}ms`, {
        parentId: 'root',
        responseTime: Date.now() - startTime,
      });
      return trees;
    } catch (error) {
      this.logger.error(`Category tree fetch failed in ${Date.now() - startTime}ms`, {
        parentId: parentId || 'root',
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.getBySlug' })
  async findBySlug(data: { slug: string }) {
    const { slug } = data;
    const startTime = Date.now();

    try {
      const category = await this.categoryRepository.findOne({
        where: { slug, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      this.logger.log(`Category fetch by slug completed in ${Date.now() - startTime}ms`, {
        slug,
        categoryId: category.id,
        responseTime: Date.now() - startTime,
      });

      return category;
    } catch (error) {
      this.logger.error(`Category fetch by slug failed in ${Date.now() - startTime}ms`, {
        slug,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.get' })
  async findOne(data: { id: string }) {
    const { id } = data;
    const startTime = Date.now();

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      this.logger.log(`Category fetch completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        responseTime: Date.now() - startTime,
      });

      return category;
    } catch (error) {
      this.logger.error(`Category fetch failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.children' })
  async findChildren(data: { id: string }) {
    const { id } = data;
    const startTime = Date.now();

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      const children = await this.categoryRepository.findDescendants(category, {
        // where: { isActive: true },
      });

      this.logger.log(`Category children fetch completed in ${Date.now() - startTime}ms`, {
        parentCategoryId: id,
        totalChildren: children.length,
        responseTime: Date.now() - startTime,
      });

      return children;
    } catch (error) {
      this.logger.error(`Category children fetch failed in ${Date.now() - startTime}ms`, {
        parentCategoryId: id,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.update' })
  async update(data: { id: string; data: UpdateCategoryDto; user: { userId: string; role: string } }) {
    const { id, data: updateCategoryDto, user } = data;
    const startTime = Date.now();

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check for name or slug conflicts
      if (updateCategoryDto.name || updateCategoryDto.slug) {
        const existingCategory = await this.categoryRepository.findOne({
          where: [
            { name: updateCategoryDto.name || category.name, id: Not(id) },
            { slug: updateCategoryDto.slug || category.slug, id: Not(id) },
          ],
        });

        if (existingCategory) {
          throw new ConflictException(
            `Category with name '${updateCategoryDto.name || category.name}' or slug '${
              updateCategoryDto.slug || category.slug
            }' already exists`,
          );
        }
      }

      // Validate parent category if provided
      if (updateCategoryDto.parentId) {
        if (updateCategoryDto.parentId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        const parentCategory = await this.categoryRepository.findOne({
          where: { id: updateCategoryDto.parentId, isActive: true },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        // Check for circular reference
        const descendants = await this.categoryRepository.findDescendants(parentCategory);
        if (descendants.some((descendant) => descendant.id === id)) {
          throw new BadRequestException('Cannot create circular category reference');
        }

        // updateCategoryDto.parent = parentCategory;
      } else if (updateCategoryDto.parentId === null) {
        // updateCategoryDto.parent = null;
      }

      await this.categoryRepository.update(id, updateCategoryDto);
      const updatedCategory = await this.categoryRepository.findOneBy({ id });

      this.logger.log(`Category update completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        updatedBy: user.userId,
        responseTime: Date.now() - startTime,
      });

      return updatedCategory;
    } catch (error) {
      this.logger.error(`Category update failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        updatedBy: user.userId,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @MessagePattern({ cmd: 'categories.delete' })
  async remove(data: { id: string; user: { userId: string; role: string } }) {
    const { id, user } = data;
    const startTime = Date.now();

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, isActive: true },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check for active children
      const children = await this.categoryRepository.findDescendants(category, {
        // where: { isActive: true },
      });

      if (children.length > 0) {
        throw new BadRequestException('Cannot delete category with active child categories');
      }

      // Check for associated products
      const products = await this.productRepository.find({
        where: { categoryId: id, isActive: true },
      });

      if (products.length > 0) {
        throw new BadRequestException('Cannot delete category with associated active products');
      }

      await this.categoryRepository.update(id, { isActive: false });

      this.logger.log(`Category deletion completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        deletedBy: user.userId,
        responseTime: Date.now() - startTime,
      });

      return { message: `Category ${id} deleted successfully` };
    } catch (error) {
      this.logger.error(`Category deletion failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        deletedBy: user.userId,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }
}