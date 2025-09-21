
// services/product-service/src/product/dto/product-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ description: 'Product UUID' })
  id: string;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product description' })
  description: string;

  @ApiProperty({ description: 'Product price' })
  price: number;

  @ApiProperty({ description: 'Product SKU' })
  sku: string;

  @ApiProperty({ description: 'Category UUID' })
  categoryId: string;

  @ApiProperty({ description: 'Seller UUID' })
  sellerId: string;

  @ApiProperty({ description: 'Array of image URLs', type: [String] })
  images: string[];

  @ApiProperty({ description: 'Whether product is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Product brand' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Product specifications' })
  specifications?: string;

  @ApiPropertyOptional({ description: 'Product weight in kg' })
  weight?: number;

  @ApiPropertyOptional({ description: 'Product dimensions' })
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  @ApiProperty({ description: 'Product category information' })
  category: {
    id: string;
    name: string;
    description?: string;
    slug?: string;
  };

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
