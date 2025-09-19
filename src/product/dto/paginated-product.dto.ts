
// services/product-service/src/product/dto/paginated-products.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';

export class PaginatedProductsDto {
  @ApiProperty({ description: 'Array of products', type: [ProductResponseDto] })
  products: ProductResponseDto[];

  @ApiProperty({ description: 'Total number of products' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}
