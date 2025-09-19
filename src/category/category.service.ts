// services/product-service/src/category/category.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram, Gauge } from 'prom-client';

import { Category } from '../product/entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { EventsService } from '../events/events.service';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: TreeRepository<Category>,
    private readonly eventsService: EventsService,
    @InjectMetric('category_operations_total')
    private readonly categoryOperationsCounter: Counter<string>,
    @InjectMetric('category_operation_duration_seconds')
    private readonly categoryOperationDuration: Histogram<string>,
    @InjectMetric('categories_total')
    private readonly categoriesGauge: Gauge<string>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto, userId: string): Promise<Category> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'create' });

    try {
      // Check if category name already exists
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: createCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException(`Category with name '${createCategoryDto.name}' already exists`);
      }

      // Generate slug if not provided
      const slug = createCategoryDto.slug || this.generateSlug(createCategoryDto.name);

      // Check if slug is unique
      const existingSlug = await this.categoryRepository.findOne({
        where: { slug },
      });

      if (existingSlug) {
        throw new ConflictException(`Category with slug '${slug}' already exists`);
      }

      let parentCategory = null;
      if (createCategoryDto.parentId) {
        parentCategory = await this.categoryRepository.findOne({
          where: { id: createCategoryDto.parentId, isActive: true },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }
      }

      // Create category
      const category = this.categoryRepository.create({
        ...createCategoryDto,
        slug,
        parent: parentCategory,
      });

      const savedCategory = await this.categoryRepository.save(category);

      // Update metrics
      this.categoryOperationsCounter.inc({ operation: 'create', status: 'success' });
      this.categoriesGauge.inc({ level: parentCategory ? 'child' : 'root' });

      // Emit event
      await this.eventsService.emitCategoryCreated({
        categoryId: savedCategory.id,
        name: savedCategory.name,
        slug: savedCategory.slug,
        parentId: parentCategory?.id,
        createdBy: userId,
      });

      this.logger.log(`Category created successfully: ${savedCategory.name}`, {
        categoryId: savedCategory.id,
        createdBy: userId,
        parentId: parentCategory?.id,
      });

      return savedCategory;
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'create', status: 'error' });
      this.logger.error(`Category creation failed:`, error.message, {
        createdBy: userId,
        name: createCategoryDto.name,
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async findAll(): Promise<Category[]> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'find_all' });

    try {
      const categories = await this.categoryRepository.findTrees();

      this.categoryOperationsCounter.inc({ operation: 'find_all', status: 'success' });

      return categories.filter(category => category.isActive);
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'find_all', status: 'error' });
      this.logger.error('Failed to fetch categories:', error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async findRootCategories(): Promise<Category[]> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'find_roots' });

    try {
      const categories = await this.categoryRepository.findRoots();

      this.categoryOperationsCounter.inc({ operation: 'find_roots', status: 'success' });

      return categories.filter(category => category.isActive);
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'find_roots', status: 'error' });
      this.logger.error('Failed to fetch root categories:', error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async findOne(id: string): Promise<Category> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'find_one' });

    try {
      const category = await this.categoryRepository.findOne({
        where: { id, isActive: true },
        relations: ['parent', 'children', 'products'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      this.categoryOperationsCounter.inc({ operation: 'find_one', status: 'success' });

      return category;
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'find_one', status: 'error' });
      this.logger.error(`Failed to fetch category ${id}:`, error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async findBySlug(slug: string): Promise<Category> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'find_by_slug' });

    try {
      const category = await this.categoryRepository.findOne({
        where: { slug, isActive: true },
        relations: ['parent', 'children', 'products'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      this.categoryOperationsCounter.inc({ operation: 'find_by_slug', status: 'success' });

      return category;
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'find_by_slug', status: 'error' });
      this.logger.error(`Failed to fetch category by slug ${slug}:`, error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async findChildren(parentId: string): Promise<Category[]> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'find_children' });

    try {
      const parentCategory = await this.categoryRepository.findOne({
        where: { id: parentId, isActive: true },
      });

      if (!parentCategory) {
        throw new NotFoundException('Parent category not found');
      }

      const children = await this.categoryRepository.findDescendants(parentCategory);

      this.categoryOperationsCounter.inc({ operation: 'find_children', status: 'success' });

      return children.filter(category => category.isActive && category.id !== parentId);
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'find_children', status: 'error' });
      this.logger.error(`Failed to fetch children for category ${parentId}:`, error.message);
      throw error;
    } finally {
      timer();
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto, userId: string): Promise<Category> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'update' });

    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['parent'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check if name is being updated and if it conflicts
      if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
        const existingCategory = await this.categoryRepository.findOne({
          where: { name: updateCategoryDto.name },
        });

        if (existingCategory && existingCategory.id !== id) {
          throw new ConflictException(`Category with name '${updateCategoryDto.name}' already exists`);
        }
      }

      // Generate new slug if name changed or slug is provided
      let slug = updateCategoryDto.slug;
      if (updateCategoryDto.name && !updateCategoryDto.slug) {
        slug = this.generateSlug(updateCategoryDto.name);
      }

      // Check slug uniqueness if it's being updated
      if (slug && slug !== category.slug) {
        const existingSlug = await this.categoryRepository.findOne({
          where: { slug },
        });

        if (existingSlug && existingSlug.id !== id) {
          throw new ConflictException(`Category with slug '${slug}' already exists`);
        }
      }

      // Handle parent category change
      let parentCategory = category.parent;
      if (updateCategoryDto.parentId !== undefined) {
        if (updateCategoryDto.parentId) {
          // Check if new parent exists
          parentCategory = await this.categoryRepository.findOne({
            where: { id: updateCategoryDto.parentId, isActive: true },
          });

          if (!parentCategory) {
            throw new NotFoundException('Parent category not found');
          }

          // Prevent circular reference
          if (updateCategoryDto.parentId === id) {
            throw new BadRequestException('Category cannot be its own parent');
          }

          // Check if the new parent is not a descendant of this category
          const descendants = await this.categoryRepository.findDescendants(category);
          if (descendants.some(desc => desc.id === updateCategoryDto.parentId)) {
            throw new BadRequestException('Cannot set a descendant category as parent');
          }
        } else {
          parentCategory = null;
        }
      }

      // Update category
      await this.categoryRepository.update(id, {
        ...updateCategoryDto,
        slug,
        parent: parentCategory,
      });

      const updatedCategory = await this.categoryRepository.findOne({
        where: { id },
        relations: ['parent', 'children'],
      });

      // Emit event
      await this.eventsService.emitCategoryUpdated({
        categoryId: updatedCategory.id,
        name: updatedCategory.name,
        slug: updatedCategory.slug,
        parentId: updatedCategory.parent?.id,
        updatedBy: userId,
        changes: updateCategoryDto,
      });

      this.categoryOperationsCounter.inc({ operation: 'update', status: 'success' });

      this.logger.log(`Category updated successfully: ${updatedCategory.name}`, {
        categoryId: updatedCategory.id,
        updatedBy: userId,
        changes: Object.keys(updateCategoryDto),
      });

      return updatedCategory;
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'update', status: 'error' });
      this.logger.error(`Category update failed for ${id}:`, error.message, {
        categoryId: id,
        updatedBy: userId,
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'delete' });

    try {
      const category = await this.categoryRepository.findOne({
        where: { id },
        relations: ['children', 'products'],
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      // Check if category has active children
      const activeChildren = category.children?.filter(child => child.isActive) || [];
      if (activeChildren.length > 0) {
        throw new BadRequestException('Cannot delete category with active subcategories');
      }

      // Check if category has active products
      const activeProducts = category.products?.filter(product => product.isActive) || [];
      if (activeProducts.length > 0) {
        throw new BadRequestException('Cannot delete category with active products');
      }

      // Soft delete - mark as inactive
      await this.categoryRepository.update(id, { isActive: false });

      // Update metrics
      this.categoriesGauge.dec({ level: category.parent ? 'child' : 'root' });

      // Emit event
      await this.eventsService.emitCategoryDeleted({
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        deletedBy: userId,
      });

      this.categoryOperationsCounter.inc({ operation: 'delete', status: 'success' });

      this.logger.log(`Category deleted successfully: ${category.name}`, {
        categoryId: category.id,
        deletedBy: userId,
      });
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'delete', status: 'error' });
      this.logger.error(`Category deletion failed for ${id}:`, error.message, {
        categoryId: id,
        deletedBy: userId,
        error: error.message,
      });
      throw error;
    } finally {
      timer();
    }
  }

  async getCategoryTree(parentId?: string): Promise<Category[]> {
    const timer = this.categoryOperationDuration.startTimer({ operation: 'get_tree' });

    try {
      if (parentId) {
        const parentCategory = await this.categoryRepository.findOne({
          where: { id: parentId, isActive: true },
        });

        if (!parentCategory) {
          throw new NotFoundException('Parent category not found');
        }

        const tree = await this.categoryRepository.findDescendantsTree(parentCategory);
        return [tree].filter(category => category.isActive);
      } else {
        const trees = await this.categoryRepository.findTrees();
        return trees.filter(category => category.isActive);
      }
    } catch (error) {
      this.categoryOperationsCounter.inc({ operation: 'get_tree', status: 'error' });
      this.logger.error('Failed to fetch category tree:', error.message);
      throw error;
    } finally {
      timer();
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  }
}