// services/product-service/src/category/category.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  private readonly logger = new Logger(CategoryController.name);

  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'Category name or slug already exists' })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Request() req: RequestWithUser,
  ) {
    const startTime = Date.now();

    try {
      const category = await this.categoryService.create(createCategoryDto, req.user.sub);

      this.logger.log(`Category creation completed in ${Date.now() - startTime}ms`, {
        categoryId: category.id,
        createdBy: req.user.sub,
        name: category.name,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category created successfully',
        data: category,
      };
    } catch (error) {
      this.logger.error(`Category creation failed in ${Date.now() - startTime}ms`, {
        createdBy: req.user.sub,
        name: createCategoryDto.name,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all categories in tree structure' })
  @ApiResponse({ status: 200, description: 'Categories fetched successfully' })
  async findAll() {
    const startTime = Date.now();

    try {
      const categories = await this.categoryService.findAll();

      this.logger.log(`Categories fetch completed in ${Date.now() - startTime}ms`, {
        totalCategories: categories.length,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Categories fetched successfully',
        data: categories,
      };
    } catch (error) {
      this.logger.error(`Categories fetch failed in ${Date.now() - startTime}ms`, {
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get('roots')
  @Public()
  @ApiOperation({ summary: 'Get all root categories (no parent)' })
  @ApiResponse({ status: 200, description: 'Root categories fetched successfully' })
  async findRootCategories() {
    const startTime = Date.now();

    try {
      const categories = await this.categoryService.findRootCategories();

      this.logger.log(`Root categories fetch completed in ${Date.now() - startTime}ms`, {
        totalRootCategories: categories.length,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Root categories fetched successfully',
        data: categories,
      };
    } catch (error) {
      this.logger.error(`Root categories fetch failed in ${Date.now() - startTime}ms`, {
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get('tree/:parentId?')
  @Public()
  @ApiOperation({ summary: 'Get category tree structure' })
  @ApiResponse({ status: 200, description: 'Category tree fetched successfully' })
  @ApiResponse({ status: 404, description: 'Parent category not found' })
  async getCategoryTree(@Param('parentId') parentId?: string) {
    const startTime = Date.now();

    try {
      const tree = await this.categoryService.getCategoryTree(parentId);

      this.logger.log(`Category tree fetch completed in ${Date.now() - startTime}ms`, {
        parentId: parentId || 'root',
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category tree fetched successfully',
        data: tree,
      };
    } catch (error) {
      this.logger.error(`Category tree fetch failed in ${Date.now() - startTime}ms`, {
        parentId: parentId || 'root',
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({ summary: 'Get category by slug' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findBySlug(@Param('slug') slug: string) {
    const startTime = Date.now();

    try {
      const category = await this.categoryService.findBySlug(slug);

      this.logger.log(`Category fetch by slug completed in ${Date.now() - startTime}ms`, {
        slug,
        categoryId: category.id,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category fetched successfully',
        data: category,
      };
    } catch (error) {
      this.logger.error(`Category fetch by slug failed in ${Date.now() - startTime}ms`, {
        slug,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const startTime = Date.now();

    try {
      const category = await this.categoryService.findOne(id);

      this.logger.log(`Category fetch completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category fetched successfully',
        data: category,
      };
    } catch (error) {
      this.logger.error(`Category fetch failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Get(':id/children')
  @Public()
  @ApiOperation({ summary: 'Get category children' })
  @ApiResponse({ status: 200, description: 'Category children fetched successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findChildren(@Param('id', ParseUUIDPipe) id: string) {
    const startTime = Date.now();

    try {
      const children = await this.categoryService.findChildren(id);

      this.logger.log(`Category children fetch completed in ${Date.now() - startTime}ms`, {
        parentCategoryId: id,
        totalChildren: children.length,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category children fetched successfully',
        data: children,
      };
    } catch (error) {
      this.logger.error(`Category children fetch failed in ${Date.now() - startTime}ms`, {
        parentCategoryId: id,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'Category name or slug already exists' })
  @ApiResponse({ status: 400, description: 'Invalid parent category or circular reference' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: RequestWithUser,
  ) {
    const startTime = Date.now();

    try {
      const category = await this.categoryService.update(id, updateCategoryDto, req.user.sub);

      this.logger.log(`Category update completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        updatedBy: req.user.sub,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category updated successfully',
        data: category,
      };
    } catch (error) {
      this.logger.error(`Category update failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        updatedBy: req.user.sub,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SYSTEM_ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 204, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete category with active children or products' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ) {
    const startTime = Date.now();

    try {
      await this.categoryService.remove(id, req.user.sub);

      this.logger.log(`Category deletion completed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        deletedBy: req.user.sub,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Category deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Category deletion failed in ${Date.now() - startTime}ms`, {
        categoryId: id,
        deletedBy: req.user.sub,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }
}