import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  Logger,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/product-filter.dto';
import { ProductQueryOptions, ProductService } from './product.service';


interface RequestWithUser extends Request {
  user: {
    sub: string;
    email: string;
    role: string;
  };
}

@ApiTags('Products')
@Controller('products')
export class ProductController {
  private readonly logger = new Logger(ProductController.name);

  constructor(private readonly productService: ProductService) {}


  async create(
    @Body() createProductDto: CreateProductDto,
    @Request() req: RequestWithUser,
  ) {
    const startTime = Date.now();

    try {
      const product = await this.productService.create(createProductDto, req.user.sub);

      this.logger.log(`Product creation completed in ${Date.now() - startTime}ms`, {
        productId: product.id,
        sellerId: req.user.sub,
        sku: product.sku,
        responseTime: Date.now() - startTime,
      });

      return {
        success: true,
        message: 'Product created successfully',
        data: product,
      };
    } catch (error) {
      this.logger.error(`Product creation failed in ${Date.now() - startTime}ms`, {
        sellerId: req.user.sub,
        error: error.message,
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

}
